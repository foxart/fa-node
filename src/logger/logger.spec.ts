import { LoggerOriginInterface, StackFrameInterface } from '../helpers/stack.helper';
import { LoggerBrowser } from './logger.browser';
import { LoggerClass, LoggerRenderOutputOptionsInterface } from './logger.class';
import { LoggerEnum } from './logger.map';
import { LoggerNest } from './logger.nest';
import { LoggerNode } from './logger.node';

function invoke<R>(target: object, method: string, ...args: unknown[]): R {
  const callback = (target as Record<string, (...parameters: unknown[]) => unknown>)[method];
  return callback.apply(target, args) as R;
}

describe('logger', () => {
  let stdout: jest.SpyInstance;
  let stderr: jest.SpyInstance;

  beforeEach(() => {
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('LoggerBrowser', () => {
    it('should return original arguments without metadata', () => {
      const logger = new LoggerBrowser();

      expect(logger.log('value')).toStrictEqual(['value']);
      expect(logger.info('value')).toStrictEqual(['value']);
      expect(logger.warn('value')).toStrictEqual(['value']);
      expect(logger.error('value')).toStrictEqual(['value']);
      expect(logger.debug('value')).toStrictEqual(['value']);
      expect(logger.custom('value')).toStrictEqual(['value']);
    });

    it('should render all configured browser metadata', () => {
      const logger = new LoggerBrowser({
        color: true,
        info: true,
        name: 'browser',
        date: true,
        time: true,
        performance: true,
      });

      for (const output of [
        logger.log('value'),
        logger.info('value'),
        logger.warn('value'),
        logger.error('value'),
        logger.debug('value'),
        logger.custom('value'),
      ]) {
        expect(output[0]).toContain('%c');
        expect(output).toContain('value');
      }
    });

    it('should support colorless metadata and console override/restore', () => {
      const logger = new LoggerBrowser({ info: true });
      const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      expect(logger.log('value')).toContain('');
      logger.override();
      expect(() => console.log('value')).not.toThrow();
      logger.restore();
      consoleLog.mockRestore();
    });

    it('should initialize without a performance API', () => {
      const original = globalThis.performance;
      try {
        (globalThis as unknown as { performance?: typeof globalThis.performance }).performance = undefined;
        expect(new LoggerBrowser({ performance: true }).log('value')).toStrictEqual(['value']);
      } finally {
        globalThis.performance = original;
      }
    });
  });

  describe('LoggerClass', () => {
    it('should resolve callers and metadata', () => {
      const logger = new LoggerClass({});
      const visible: LoggerOriginInterface = {
        visible: true,
        frame: { file: 'src/my-service.ts', caller: '<anonymous>', method: 'run', line: 10, column: 2 },
      };

      expect(logger.resolveCaller({ file: 'file.ts', caller: 'Service' })).toBe('Service');
      expect(logger.resolveCaller(undefined)).toBe('unknown');
      expect(logger.resolveCaller({ file: '/', caller: '' })).toBe('unknown');
      expect(logger.resolveCaller({ file: '.ts', caller: '' })).toBe('unknown');
      expect(logger.resolveCaller(visible.frame)).toBe('MyService');
      expect(logger.buildRenderMetadata(undefined)).toBeUndefined();
      expect(logger.buildRenderMetadata(visible)).toStrictEqual({
        caller: 'MyService',
        method: 'run',
        linkFile: 'src/my-service.ts:10:2',
      });
      expect(
        logger.buildRenderMetadata(visible, {
          callerOverride: 'Override',
          methodOverride: 'method',
          hideMethodSet: new Set(['run']),
        }),
      ).toStrictEqual({
        caller: 'Override',
        method: 'method',
        linkFile: 'src/my-service.ts:10:2',
      });
      expect(logger.buildRenderMetadata(visible, { hideMethodSet: new Set(['run']) })?.method).toBeUndefined();
      expect(logger.buildRenderMetadata({ ...visible, visible: false })?.linkFile).toBeUndefined();
      expect(logger.resolveOrigin('', 0)).toStrictEqual({ visible: false });
      expect(logger.resolveOrigin()).toStrictEqual({ visible: false });
    });

    it('should render a fully configured output', () => {
      const logger = new LoggerClass({
        color: true,
        level: true,
        env: 'test',
        pid: true,
        date: true,
        time: true,
        metadata: true,
        performance: true,
        link: true,
        stackDebug: true,
      });
      const options: LoggerRenderOutputOptionsInterface = {
        level: 'DBG',
        metadata: { caller: 'Service', method: 'run', linkFile: 'src/file.ts:1:2' },
        messages: ['GET /path 12.5'],
        debugTrace: [{ file: 'src/file.ts', caller: 'Service', method: 'run', line: 1, column: 2 }],
        formatString: (value) => value,
      };

      invoke(logger, 'stdout', options);

      expect(stdout).toHaveBeenCalledWith(expect.stringContaining('GET /path 12.5'));
    });

    it('should render minimal output and disabled private sections', () => {
      const logger = new LoggerClass({});

      invoke(logger, 'stdout', {
        level: 'LOG',
        metadata: undefined,
        messages: ['value'],
        debugTrace: [],
      });

      expect(invoke(logger, 'renderTimestamp')).toBeUndefined();
      expect(invoke(logger, 'renderLevel', 'LOG')).toBeUndefined();
      expect(invoke(logger, 'renderMetadata', undefined)).toBeUndefined();
      expect(invoke(logger, 'renderEnv', 'LOG')).toBeUndefined();
      expect(invoke(logger, 'renderPid')).toBeUndefined();
      expect(invoke(logger, 'renderDebug', 'DBG', [], false)).toBeUndefined();
      expect(invoke(logger, 'renderDebug', 'DBG', [])).toContain('{');
      expect(invoke(logger, 'renderPerformance', 'LOG')).toBeUndefined();
      expect(invoke(logger, 'renderLink', 'LOG', undefined)).toBeUndefined();
    });

    it('should colorize strings and token separators', () => {
      const logger = new LoggerClass({ color: true });
      const value = invoke<string>(
        logger,
        'colorizeString',
        `"text" 'value' ABC 12.5 /path,{x:y};.`,
        LoggerEnum.DEFAULT,
      );

      expect(value).toContain(logger.ef.reset);
      expect(invoke(new LoggerClass({}), 'colorizeString', 'plain', LoggerEnum.DEFAULT)).toBe('plain');
      expect(invoke(logger, 'colorizeString', '\u0000', LoggerEnum.DEFAULT)).toContain('\u0000');
      expect(invoke(logger, 'render', LoggerEnum.STRING, 'value')).toContain('value');
      expect(invoke(logger, 'applyForeground', 'UNKNOWN', 'value')).toContain('value');
      expect(invoke(logger, 'applyBackground', 'UNKNOWN', 'value')).toContain('value');
      expect(invoke(logger, 'applyToken', 'UNKNOWN', 'value')).toContain('value');
      expect(invoke(new LoggerClass({}), 'applyForeground', 'LOG', 'value')).toBe('value');
      expect(invoke(new LoggerClass({}), 'applyBackground', 'LOG', 'value')).toBe('value');
    });

    it('should normalize supported values and limits', () => {
      const logger = new LoggerClass({ maxDepth: 1, maxArrayLength: 2 });
      const circular: { self?: unknown } = {};
      circular.self = circular;
      class Custom {}

      expect(invoke(logger, 'normalizeForInspect', Buffer.from('a'))).toBe('[Buffer 1 bytes]');
      expect(invoke(logger, 'normalizeForInspect', new Uint8Array([1, 2]))).toBe('[TypedArray 2 bytes]');
      expect(invoke(logger, 'normalizeForInspect', new Date('2020-01-01T00:00:00.000Z'))).toBe(
        '2020-01-01T00:00:00.000Z',
      );
      expect(invoke(logger, 'normalizeForInspect', /value/)).toBe('/value/');
      expect(invoke(logger, 'normalizeForInspect', new URL('https://example.com'))).toBe('https://example.com/');
      expect(invoke(logger, 'normalizeForInspect', { pipe: () => undefined })).toBe('[Stream]');
      expect(invoke(logger, 'normalizeForInspect', circular)).toStrictEqual({ self: '[circular]' });
      expect(invoke(logger, 'normalizeForInspect', [1, 2, 3])).toStrictEqual([1, 2, '[+1 more items]']);
      expect(invoke(logger, 'normalizeForInspect', new Map<unknown, unknown>([[1, 'one'], [2, 'two'], [3, 'three']]))).toStrictEqual({
        '1': 'one',
        '2': 'two',
        __truncated__: '[+1 more entries]',
      });
      expect(invoke(logger, 'normalizeForInspect', new Map([['key', 'value']]))).toStrictEqual({ key: 'value' });
      expect(invoke(logger, 'normalizeForInspect', new Set([1, 2, 3]))).toStrictEqual([
        1,
        2,
        '[+1 more items]',
      ]);
      expect(invoke(logger, 'normalizeForInspect', new Custom())).toBeInstanceOf(Custom);
      expect(invoke(logger, 'normalizeForInspect', { a: 1, b: 2, c: 3 })).toStrictEqual({
        a: 1,
        b: 2,
        __truncated__: '[+more keys truncated]',
      });
      expect(invoke(logger, 'normalizeForInspect', { nested: { deep: { value: true } } })).toStrictEqual({
        nested: { deep: '[Max depth reached]' },
      });
      expect(invoke(logger, 'normalizeForInspect', 1)).toBe(1);
      expect(invoke(logger, 'normalizeForInspect', new Error('failure'))).toMatchObject({
        name: 'Error',
        message: 'failure',
      });
      expect(
        invoke(
          logger,
          'normalizeCircular',
          { value: true },
          (error: Error) => error.message,
        ),
      ).toStrictEqual({ value: true });
    });

    it('should serialize and format errors', () => {
      const logger = new LoggerClass({ errorStack: true });
      const error = Object.assign(new Error('failure'), {
        code: 500,
        nested: new Error('nested'),
      });
      const serialized = invoke<{
        name: string;
        message: string;
        stack?: StackFrameInterface[] | string;
        details?: Record<string, unknown>;
      }>(logger, 'serializeError', error);

      expect(serialized.name).toBe('Error');
      expect(serialized.details).toMatchObject({ code: 500 });
      expect(invoke(logger, 'normalizeErrorDetails', new Error('plain'))).toBeUndefined();
      const enumerable = Object.assign(new Error('enumerable'), {
        name: 'EnumerableError',
        stack: 'stack',
      });
      expect(invoke(logger, 'normalizeErrorDetails', enumerable)).toBeUndefined();
      expect(
        invoke(
          logger,
          'formatMessageList',
          [error, 'text', { value: true }],
          () => 'TRACE',
          (value: unknown) => JSON.stringify(value),
          (value: string) => value.toUpperCase(),
        ),
      ).toContain('TEXT');
      const stringStack = new Error('string stack');
      stringStack.stack = 'custom stack';
      expect(
        invoke(
          logger,
          'formatTopLevelError',
          stringStack,
          () => 'TRACE',
          (value: unknown) => JSON.stringify(value),
        ),
      ).toContain('custom stack');
      expect(
        invoke(
          new LoggerClass({}),
          'formatTopLevelError',
          new Error('no stack'),
          () => 'TRACE',
          (value: unknown) => JSON.stringify(value),
        ),
      ).toContain('no stack');
      expect(invoke(logger, 'applyColor', 'value', [logger.fg.red])).toContain('value');
      expect(invoke(logger, 'applyColor', 'value', [])).toBe('value');
      const colored = new LoggerClass({ color: true });
      expect(invoke(colored, 'applyColor', 'value', [colored.fg.red])).toContain(colored.fg.red);
    });

    it('should handle stdout failures and render the original payload', () => {
      const logger = new LoggerClass({});
      const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
      stdout.mockImplementationOnce(() => {
        throw new Error('write failure');
      });

      invoke(logger, 'stdout', {
        level: 'ERR',
        metadata: undefined,
        messages: ['payload'],
        debugTrace: [],
      });

      expect(stderr).toHaveBeenCalled();
      expect(exit).toHaveBeenCalledWith(1);
    });
  });

  describe('LoggerNode', () => {
    it('should write every level and map arguments', () => {
      const logger = new LoggerNode({ metadata: true }, (args) => args.map((value) => `mapped:${String(value)}`));

      logger.log('log');
      logger.error('error');
      logger.warn('warn');
      logger.debug('debug');
      logger.info('info');
      logger.print('LOG', { visible: false }, ['direct']);
      logger.print('LOG', [{ file: 'src/file.ts', caller: 'Service', method: 'run' }], ['trace']);
      logger.writeWithMetadata('LOG', { callerOverride: 'Override' }, 'metadata');
      logger.errorWithStack('    at Service.run (/tmp/file.ts:1:2)', 'stack');
      logger.errorWithStack(undefined, 'origin');

      expect(stdout).toHaveBeenCalledTimes(10);
    });

    it('should use identity argument mapping by default', () => {
      new LoggerNode({}).log('value');
      expect(stdout).toHaveBeenCalled();
    });
  });

  describe('LoggerNest', () => {
    it('should write Nest levels and skip the startup message', () => {
      const logger = new LoggerNest({ metadata: true });

      logger.log('log', 'Context');
      logger.warn('warn', 'Context');
      logger.warn('warn', 1);
      logger.debug('debug', 'Context');
      logger.debug('debug', 1);
      logger.verbose('verbose', 'Context');
      logger.verbose('verbose', 1);
      logger.fatal('fatal', 'Context');
      logger.fatal('fatal', 1);
      logger.log('without context', 1);
      logger.log('Nest application successfully started');

      expect(stdout).toHaveBeenCalledTimes(10);
    });

    it('should normalize Nest error call shapes', () => {
      const logger = new LoggerNest({ errorStack: true });
      const stack = 'Error: failure\n    at Service.run (/tmp/file.ts:1:2)';

      logger.error('TypeError: failure', stack, { detail: true }, undefined, 'Context');
      logger.error('failure', stack);
      logger.error(new Error('failure'), 'Context');
      logger.error('plain', { detail: true });
      logger.error(undefined);

      expect(stdout).toHaveBeenCalledTimes(4);
    });

    it('should print arrays, Nest contexts, HTTP methods, and metadata overrides', () => {
      const logger = new LoggerNest({ color: true, metadata: true });

      logger.print(
        'LOG',
        { visible: true, frame: { file: 'src/file.ts', caller: 'NestFactory', method: 'log' } },
        ['GET', '/path'],
      );
      logger.print('LOG', { visible: false }, 'POST /path');
      logger.writeWithMetadata('LOG', { callerOverride: 'Override' }, 'value');

      expect(stdout).toHaveBeenCalledTimes(3);
    });

    it('should return uncolored Nest messages', () => {
      const logger = new LoggerNest({});

      expect(invoke(logger, 'colorizeMessage', 'GET /path', LoggerEnum.DEFAULT)).toBe('GET /path');
      expect(invoke(new LoggerNest({ color: true }), 'colorizeMessage', 'GET /path', LoggerEnum.DEFAULT)).toContain(
        'GET',
      );
    });
  });
});
