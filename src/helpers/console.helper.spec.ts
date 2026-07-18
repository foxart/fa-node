import { ConsoleHelper } from './console.helper';

describe('ConsoleHelper', () => {
  beforeEach(() => {
    ConsoleHelper.restore();
  });

  afterEach(() => {
    ConsoleHelper.restore();
  });

  it('should override every console method and preserve the replacement receiver', () => {
    const replacement = {
      log: jest.fn(function (this: { label: string }, ...args: unknown[]) {
        return [this.label, args];
      }),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      label: 'replacement',
    };

    ConsoleHelper.override(replacement);

    console.log('log');
    console.info('info');
    console.warn('warn');
    console.error('error');
    console.debug('debug');

    expect(replacement.log).toHaveBeenCalledWith('log');
    expect(replacement.log.mock.contexts[0]).toBe(replacement);
    expect(replacement.info).toHaveBeenCalledWith('info');
    expect(replacement.warn).toHaveBeenCalledWith('warn');
    expect(replacement.error).toHaveBeenCalledWith('error');
    expect(replacement.debug).toHaveBeenCalledWith('debug');
  });

  it('should restore the original console methods', () => {
    const originalLog = console.log;
    const replacement = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    ConsoleHelper.override(replacement);
    ConsoleHelper.restore();

    expect(console.log).toBe(originalLog);
  });
});
