import { LoggerNode } from './logger.node';

describe('LoggerNode', () => {
  let stdout: jest.SpyInstance;

  beforeEach(() => {
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should write every level and map arguments', () => {
    const logger = new LoggerNode({ metadata: true }, (args) => args.map((value) => `mapped:${String(value)}`));

    logger.log('log'); logger.error('error'); logger.warn('warn'); logger.debug('debug'); logger.info('info');
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
