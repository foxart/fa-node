import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';
import os from 'node:os';

import { AnsiHelper } from './ansi.helper';
import { IoHelper } from './io.helper';
import { IpHelper } from './ip.helper';
import { ParserHelper } from './parser.helper';
import { LoggerOriginInterface, StackFrameInterface, StackHelper } from './stack.helper';
import { StringHelper } from './string.helper';
import { SystemHelper } from './system.helper';

describe('basic helpers', () => {
  describe('AnsiHelper', () => {
    it('should expose codes and apply them', () => {
      expect(AnsiHelper.apply('plain', [])).toBe('plain');
      expect(AnsiHelper.apply('value', [AnsiHelper.ef.bold, AnsiHelper.fg.red])).toBe(
        `${AnsiHelper.ef.bold}${AnsiHelper.fg.red}value${AnsiHelper.ef.reset}`,
      );
      expect(AnsiHelper.bg.blue).toBe('\u001b[44m');
    });
  });

  describe('IoHelper', () => {
    let temporaryDirectory: string;

    beforeEach(() => {
      temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fa-node-io-'));
    });

    afterEach(() => {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('should create, read, scan, and delete files', () => {
      const nested = path.join(temporaryDirectory, 'nested');
      const textFile = path.join(nested, 'value.txt');
      const jsonFile = path.join(temporaryDirectory, 'value.json');

      expect(IoHelper.checkPath(textFile)).toBe(false);
      IoHelper.createDirectorySync(nested, true);
      IoHelper.createDirectorySync(nested, true);
      IoHelper.createFileSync(textFile, 'content');
      IoHelper.createFileSync(jsonFile, '{}');

      expect(IoHelper.checkPath(textFile)).toBe(true);
      expect(IoHelper.readFileSync(textFile, 'utf8')).toBe('content');
      expect(IoHelper.scanFilesSync(path.join(temporaryDirectory, 'missing'))).toStrictEqual([]);
      expect(IoHelper.scanFilesSync(temporaryDirectory, { recursive: true, filter: [/\.txt$/] })).toStrictEqual([
        textFile,
      ]);
      expect(IoHelper.scanFilesSync(temporaryDirectory)).toContain(nested);
      expect(IoHelper.scanDirectoriesSync(path.join(temporaryDirectory, 'missing'))).toStrictEqual([]);
      expect(IoHelper.scanDirectoriesSync(temporaryDirectory, { recursive: true, filter: [/\.json$/] })).toStrictEqual([
        jsonFile,
      ]);
      expect(IoHelper.scanDirectoriesSync(temporaryDirectory)).toContain(nested);

      IoHelper.deleteFileSync(textFile);
      expect(IoHelper.checkPath(textFile)).toBe(false);
      IoHelper.deleteDirectorySync(nested, { onlyEmpty: true });
      expect(IoHelper.checkPath(nested)).toBe(false);
      const defaultDelete = path.join(temporaryDirectory, 'default-delete');
      IoHelper.createDirectorySync(defaultDelete);
      expect(() => IoHelper.deleteDirectorySync(defaultDelete)).toThrow();
      IoHelper.deleteDirectorySync(temporaryDirectory, { recursive: true });
      expect(IoHelper.checkPath(temporaryDirectory)).toBe(false);
    });

    it('should retain non-empty directories when deleting only empty trees', () => {
      const parent = path.join(temporaryDirectory, 'parent');
      const empty = path.join(parent, 'empty');
      const occupied = path.join(parent, 'occupied');
      IoHelper.createDirectorySync(empty, true);
      IoHelper.createFileSync(path.join(occupied, 'value.txt'), 'value');

      IoHelper.deleteDirectorySync(parent, { onlyEmpty: true });

      expect(IoHelper.checkPath(empty)).toBe(false);
      expect(IoHelper.checkPath(occupied)).toBe(true);
      expect(IoHelper.checkPath(parent)).toBe(true);
    });
  });

  describe('IpHelper', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should find an external IPv4 address', () => {
      jest.spyOn(os, 'networkInterfaces').mockReturnValue({
        empty: undefined,
        internal: [
          {
            address: '127.0.0.1',
            netmask: '255.0.0.0',
            family: 'IPv4',
            mac: '00:00:00:00:00:00',
            internal: true,
            cidr: '127.0.0.1/8',
          },
        ],
        external: [
          {
            address: '10.0.0.2',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '00:00:00:00:00:01',
            internal: false,
            cidr: '10.0.0.2/24',
          },
        ],
      });

      expect(IpHelper.getLocalIp()).toBe('10.0.0.2');
    });

    it('should return null without an external IPv4 address', () => {
      jest.spyOn(os, 'networkInterfaces').mockReturnValue({});

      expect(IpHelper.getLocalIp()).toBeNull();
    });

    it('should resolve request IP sources in priority order', () => {
      expect(IpHelper.getRequestIp({ socket: { remoteAddress: '127.0.0.1' } } as Request)).toBe('127.0.0.1');
      expect(
        IpHelper.getRequestIp({
          socket: {},
          connection: { remoteAddress: '::1' },
        } as unknown as Request),
      ).toBe('::1');
      expect(
        IpHelper.getRequestIp({
          socket: {},
          connection: { socket: { remoteAddress: '192.168.0.1' } },
        } as unknown as Request),
      ).toBe('192.168.0.1');
      expect(
        IpHelper.getRequestIp({
          socket: {},
          headers: { 'x-forwarded-for': '203.0.113.1' },
        } as unknown as Request),
      ).toBe('203.0.113.1');
      expect(
        IpHelper.getRequestIp({
          socket: {},
          headers: { 'x-real-ip': '203.0.113.2' },
        } as unknown as Request),
      ).toBe('203.0.113.2');
      expect(IpHelper.getRequestIp({ socket: {}, headers: {}, info: { remoteAddress: '203.0.113.3' } } as never)).toBe(
        '203.0.113.3',
      );
      expect(
        IpHelper.getRequestIp({
          socket: {},
          headers: {},
          requestContext: { identity: { sourceIp: '203.0.113.4' } },
        } as never),
      ).toBe('203.0.113.4');
      expect(
        IpHelper.getRequestIp({
          socket: {},
          headers: {},
          raw: { socket: { remoteAddress: '203.0.113.5' } },
        } as never),
      ).toBe('203.0.113.5');
      expect(IpHelper.getRequestIp({ socket: {}, headers: { 'x-real-ip': ['invalid'] } } as never)).toBeNull();
    });

    it('should attach the resolved IP through middleware', () => {
      const request = { socket: { remoteAddress: '127.0.0.1' } } as Request;
      const next = jest.fn();

      IpHelper.middleware()(request, {} as never, next);
      expect((request as unknown as { clientIp: string }).clientIp).toBe('127.0.0.1');
      expect(next).toHaveBeenCalledTimes(1);

      const customRequest = { socket: { remoteAddress: '::1' } } as Request;
      IpHelper.middleware({ attributeName: 'sourceIp' })(customRequest, {} as never, next);
      expect((customRequest as unknown as { sourceIp: string }).sourceIp).toBe('::1');
    });

    it('should return null when no forwarded IP is valid', () => {
      const getForwarded = (
        IpHelper as unknown as {
          getClientIpFromXForwardedFor: (value: string) => string | null;
        }
      ).getClientIpFromXForwardedFor.bind(IpHelper);

      expect(getForwarded('invalid, also-invalid')).toBeNull();
    });
  });

  describe('ParserHelper', () => {
    it('should parse paths with and without extensions', () => {
      expect(ParserHelper.path('/tmp/archive.tar')).toStrictEqual({
        directory: '/tmp',
        filename: 'archive',
        extension: '.tar',
      });
      expect(ParserHelper.path('README')).toStrictEqual({
        directory: '',
        filename: 'README',
        extension: 'README',
      });
    });

    it('should parse URLs and reject unsupported protocols', () => {
      expect(ParserHelper.url('ftp://example.com')).toBeNull();
      expect(ParserHelper.url('https://example.com:8080/path?a=hello%20world&empty=#hash=yes')).toStrictEqual({
        href: 'https://example.com:8080/path?a=hello%20world&empty=#hash=yes',
        protocol: 'https:',
        host: 'example.com:8080',
        hostname: 'example.com',
        port: '8080',
        pathname: '/path',
        search: 'a=hello%20world&empty=',
        searchParams: { a: 'hello world', empty: '' },
        hash: 'hash=yes',
        hashParams: { hash: 'yes' },
      });
      expect(ParserHelper.url('http://example.com')).toMatchObject({
        searchParams: undefined,
        hashParams: undefined,
      });
    });
  });

  describe('StackHelper', () => {
    it('should parse stack traces and normalize project paths', () => {
      const root = process.cwd();
      const trace = StackHelper.toTrace(
        [
          `    at Service.run (${root}/src/service.ts:10:20)`,
          `    at root (${root}:1:2)`,
          '    at standalone (/external/file.ts:2:3)',
        ].join('\n'),
      );

      expect(StackHelper.toTrace()).toStrictEqual([]);
      expect(trace).toStrictEqual([
        { caller: 'Service', method: 'run', file: 'src/service.ts', line: 10, column: 20 },
        { caller: 'root', method: undefined, file: '.', line: 1, column: 2 },
        { caller: 'standalone', method: undefined, file: 'external/file.ts', line: 2, column: 3 },
      ]);
    });

    it('should resolve visible and fallback origins', () => {
      const hidden: StackFrameInterface = { file: 'node_modules/pkg/index.js', caller: 'Module' };
      const visible: StackFrameInterface = { file: 'src/index.ts', caller: 'Service', method: 'run', line: 1, column: 2 };

      expect(StackHelper.resolveOrigin([hidden, visible], 0)).toStrictEqual({ frame: visible, visible: true });
      expect(StackHelper.resolveOrigin([hidden], 0)).toStrictEqual({
        frame: {
          ...hidden,
          method: undefined,
          line: undefined,
          column: undefined,
        },
        visible: false,
      });
      expect(StackHelper.resolveOrigin([], 0)).toStrictEqual({ visible: false });
      let reads = 0;
      const changingTrace = new Proxy([hidden], {
        get(target, property, receiver): unknown {
          if (property === '0') {
            reads++;
            return reads === 2 ? undefined : hidden;
          }
          return Reflect.get(target, property, receiver) as unknown;
        },
      });
      expect(StackHelper.resolveOrigin(changingTrace, 0).visible).toBe(false);
      expect(StackHelper.getVisibleItems([hidden, visible])).toStrictEqual([visible]);
    });

    it('should use caller and method as fallback frame signals', () => {
      const visibleSpy = jest.spyOn(StackHelper, 'isVisibleItem').mockReturnValue(false);
      const resolveChangingFrame = (frame: StackFrameInterface): LoggerOriginInterface => {
        let reads = 0;
        const trace = new Proxy([frame], {
          get(target, property, receiver): unknown {
            if (property === '0') {
              reads++;
              return reads === 2 ? undefined : frame;
            }
            return Reflect.get(target, property, receiver) as unknown;
          },
        });
        return StackHelper.resolveOrigin(trace, 0);
      };

      expect(resolveChangingFrame({ file: '', caller: 'Module' }).frame?.caller).toBe('Module');
      expect(resolveChangingFrame({ file: '', caller: '', method: 'run' }).frame?.method).toBe('run');
      visibleSpy.mockRestore();
    });

    it('should classify hidden frames', () => {
      expect(StackHelper.isVisibleItem({ file: 'node_modules/pkg/index.js', caller: 'call' })).toBe(false);
      expect(StackHelper.isVisibleItem({ file: 'node_modules\\pkg\\index.js', caller: 'call' })).toBe(false);
      expect(StackHelper.isVisibleItem({ file: 'internal/process/task.js', caller: 'call' })).toBe(false);
      expect(StackHelper.isVisibleItem({ file: 'node:events', caller: 'call' })).toBe(false);
      expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: 'process' })).toBe(false);
      expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: 'Module' })).toBe(false);
      expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: 'Function' })).toBe(false);
      expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: '<anonymous>' })).toBe(false);
      expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: '' })).toBe(false);
      expect(StackHelper.isVisibleItem({ file: 'native', caller: 'call' })).toBe(false);
      expect(StackHelper.isVisibleItem({ file: 'src/file.ts', caller: 'Service' })).toBe(true);
      expect(StackHelper.isVisibleItem({} as StackFrameInterface)).toBe(false);
    });

    it('should clone and format frames', () => {
      const frame = { file: 'file.ts', caller: 'Service', method: 'run', line: 10, column: 2 };

      expect(StackHelper.cloneFrame(frame)).toStrictEqual(frame);
      expect(StackHelper.cloneFrame(frame)).not.toBe(frame);
      expect(StackHelper.formatFrameLocation(frame)).toBe('file.ts:10:2');
      expect(StackHelper.formatFrameLocation({ file: 'file.ts', caller: 'Service', line: 10 })).toBe('file.ts:10');
      expect(StackHelper.formatFrameLocation({ file: 'file.ts', caller: 'Service' })).toBe('file.ts');
    });
  });

  describe('StringHelper', () => {
    it('should transform common word formats', () => {
      expect(StringHelper.toKebabCase('HTTPServer value')).toBe('http-server-value');
      expect(StringHelper.toSnakeCase('camelCase-value')).toBe('camel_case_value');
      expect(StringHelper.toCamelCase('HELLO_world-value')).toBe('helloWorldValue');
      expect(StringHelper.toPascalCase('hello_world-value')).toBe('HelloWorldValue');
      expect(StringHelper.toConstantCase('helloWorld value')).toBe('HELLO_WORLD_VALUE');
    });
  });

  describe('SystemHelper', () => {
    it('should measure named and default timers', () => {
      SystemHelper.timeStart();
      expect(SystemHelper.timeEnd()).toBeGreaterThanOrEqual(0);
      SystemHelper.timeStart('named');
      expect(SystemHelper.timeEnd('named')).toBeGreaterThanOrEqual(0);
    });

    it('should sleep for the requested duration', async () => {
      jest.useFakeTimers();
      const promise = SystemHelper.sleep('10ms');
      await jest.advanceTimersByTimeAsync(10);
      await expect(promise).resolves.toBeUndefined();
      jest.useRealTimers();
    });
  });
});
