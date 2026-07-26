import { exec } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CodegenHelper } from './codegen.helper';

jest.mock('child_process', () => ({
  exec: jest.fn((_command: string, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
    callback(null, '', '');
  }),
}));

describe('CodegenHelper', () => {
  const originalFetch = globalThis.fetch;
  const mockedExec = exec as unknown as jest.Mock;
  let temporaryDirectory: string;
  let consoleLog: jest.SpyInstance;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'fa-node-codegen-'));
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockedExec.mockImplementation(
      (_command: string, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
        callback(null, '', '');
      },
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    rmSync(temporaryDirectory, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('should display success, warning, and error messages', () => {
    CodegenHelper.displayMessage('context', 'message');
    CodegenHelper.logSuccess('context', 'success');
    CodegenHelper.logWarning('context', 'warning');
    CodegenHelper.logError('context', 'failure');

    expect(consoleLog).toHaveBeenCalledTimes(4);
    for (const [message] of consoleLog.mock.calls as [[string]]) {
      expect(message).toContain('\u001b[');
    }
  });

  it('should fetch JSON and text responses', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ value: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('content'),
      });

    await expect(CodegenHelper.fetchJson('https://example.com/json', { method: 'POST' })).resolves.toStrictEqual({
      value: true,
    });
    await expect(CodegenHelper.fetchTxt('https://example.com/text', {})).resolves.toBe('content');
  });

  it('should return null for HTTP and transport failures', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: '',
      })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

    await expect(CodegenHelper.fetchJson('https://example.com/failure', {})).resolves.toBeNull();
    await expect(CodegenHelper.fetchTxt('https://example.com/offline', {})).resolves.toBeNull();
    await expect(CodegenHelper.fetchTxt('https://example.com/missing', { method: 'HEAD' })).resolves.toBeNull();
    expect(consoleLog).toHaveBeenCalled();
  });

  it('should build GraphQL output and report transformer failures', () => {
    const file = join(temporaryDirectory, 'nested', 'schema.ts');

    CodegenHelper.buildGraphql(file, { value: true }, (input) => JSON.stringify(input));
    expect(readFileSync(file, 'utf8')).toBe('{"value":true}');

    CodegenHelper.buildGraphql(file, { value: true }, () => {
      throw new Error('transform failure');
    });
    expect(consoleLog.mock.calls.some(([message]) => String(message).includes('transform failure'))).toBe(true);
  });

  it('should build proto output and enrich command failures', async () => {
    const destination = join(temporaryDirectory, 'proto');

    await CodegenHelper.buildProto('/source', destination, '/source/value.proto');
    expect(mockedExec).toHaveBeenCalledWith(
      'protoc --proto_path=/source --js_out=import_style=commonjs,binary:' +
        `${destination} --ts_out=${destination} /source/value.proto`,
      expect.any(Function),
    );

    mockedExec.mockImplementationOnce(
      (
        _command: string,
        callback: (error: Error & { code?: number; cmd?: string; stdout?: string; stderr?: string }) => void,
      ) => {
        callback(
          Object.assign(new Error('protoc failure'), {
            code: 1,
            cmd: 'protoc',
            stdout: 'stdout',
            stderr: 'stderr',
          }),
        );
      },
    );
    await CodegenHelper.buildProto('/source', destination, '/source/value.proto');
    expect(consoleLog.mock.calls.some(([message]) => String(message).includes('ProtoError'))).toBe(true);
  });

  it('should format Error metadata and non-Error values', () => {
    const nested = new Error('nested');
    const grouped = Object.assign(new Error(), {
      errors: [
        Object.assign(new Error('IPv6 refused'), { address: '::1', code: 'ECONNREFUSED' }),
        Object.assign(new Error('IPv4 refused'), { address: '127.0.0.1', code: 'ECONNREFUSED' }),
      ],
      fatal: true,
    });
    const duplicatedMessage = 'IPv6 refused, IPv4 refused';
    const wrapped = Object.assign(new Error(duplicatedMessage), {
      cause: Object.assign(new Error(duplicatedMessage), {
        errors: grouped.errors,
      }),
    });
    const circular: { self?: unknown } = {};
    circular.self = circular;
    const rich = Object.assign(new Error('failure'), {
      code: nested,
      status: circular,
      method: 'POST',
      url: 'https://example.com',
    });
    const arrayError = Object.assign(new Error('array container'), {
      details: [new Error('array detail'), 'plain detail'],
    });

    CodegenHelper.logError('context', rich);
    CodegenHelper.logError('context', grouped);
    CodegenHelper.logError('context', wrapped);
    CodegenHelper.logError('context', arrayError);
    CodegenHelper.logError('context', { value: true });
    CodegenHelper.logError('context', circular);

    const output = consoleLog.mock.calls.map(([message]) => String(message)).join('\n');
    expect(output).toContain('nested');
    expect(output).toContain('errors: [0] name: Error');
    expect(output).toContain('message: IPv6 refused');
    expect(output).toContain('message: IPv4 refused');
    expect(output).toContain('details: [0] name: Error');
    expect(output).toContain('[1] plain detail');
    const loggedMessages = consoleLog.mock.calls as unknown as [unknown][];
    expect(String(loggedMessages.at(2)?.[0])).not.toContain('cause:');
    expect(output).toContain('[object Object]');
    expect(output).toContain('{"value":true}');
  });

  it('should return input when no color is requested', () => {
    const applyColor = (
      CodegenHelper as unknown as {
        applyColor: (data: string, colors: string[]) => string;
      }
    ).applyColor.bind(CodegenHelper);

    expect(applyColor('plain', [])).toBe('plain');
  });
});
