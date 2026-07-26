import yargs from 'yargs';
import { IoHelper } from '../helpers/io.helper';
import {
  MigrationAbstractCli,
  type CommandInterface,
  type MigrationAbstractConfiguration,
} from './migration-abstract.cli';

jest.mock('yargs', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('yargs/helpers', () => ({
  hideBin: jest.fn((value: string[]) => value.slice(2)),
}));

interface TestConfiguration extends MigrationAbstractConfiguration {
  collectionMigration: string;
  collectionSeeder: string;
}

class TestMigrationCli extends MigrationAbstractCli<TestConfiguration> {
  public readonly checked = jest.fn();

  public readonly commandList: CommandInterface[] = [
    {
      name: 'status',
      desc: 'Lists migrations',
      handler: jest.fn(),
    },
    {
      name: 'create',
      desc: 'Creates migration',
      builder: (instance) => instance.positional('migration', {}),
      handler: jest.fn(),
    },
  ];

  protected check(): Promise<void> {
    this.checked();
    return Promise.resolve();
  }

  protected getTemplate(timestamp: number, migrationName: string): string {
    return `${timestamp}:${migrationName}`;
  }

  public createMigration(name: string): Promise<void> {
    return this.create(name);
  }

  public getExtension(): '.ts' | '.js' {
    return this.getMigrationExtension();
  }

  public getFileFilter(): RegExp[] {
    return this.getMigrationFileFilter();
  }

  public getFileName(name: string): string {
    return this.getMigrationFileName(name);
  }

  public normalizeFileName(name: string): string {
    return this.normalizeMigrationFileName(name);
  }

  public scanFiles(): string[] {
    return this.scanMigrationFiles();
  }
}

describe('MigrationAbstractCli', () => {
  const configuration: TestConfiguration = {
    pathMigration: '/virtual/migrations',
    pathSeeder: '/virtual/seeders',
    uri: 'database://localhost/database',
    database: 'database',
    collectionMigration: 'migrations',
    collectionSeeder: 'seeders',
  };
  const mockedYargs = yargs as unknown as jest.Mock;
  let cli: TestMigrationCli;
  let exit: jest.SpyInstance;
  let yargsInstance: {
    command: jest.Mock;
    demandCommand: jest.Mock;
    strictCommands: jest.Mock;
    fail: jest.Mock;
    wrap: jest.Mock;
    help: jest.Mock;
    showHelp: jest.Mock;
    argv: unknown;
  };

  beforeEach(() => {
    cli = new TestMigrationCli();
    exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    yargsInstance = {
      command: jest.fn(),
      demandCommand: jest.fn(),
      strictCommands: jest.fn(),
      fail: jest.fn(),
      wrap: jest.fn(),
      help: jest.fn(),
      showHelp: jest.fn(),
      argv: {},
    };
    yargsInstance.command.mockReturnValue(yargsInstance);
    yargsInstance.demandCommand.mockReturnValue(yargsInstance);
    yargsInstance.strictCommands.mockReturnValue(yargsInstance);
    yargsInstance.fail.mockReturnValue(yargsInstance);
    yargsInstance.wrap.mockReturnValue(yargsInstance);
    yargsInstance.help.mockReturnValue(yargsInstance);
    mockedYargs.mockReset().mockReturnValue(yargsInstance);
    jest.spyOn(IoHelper, 'createFileSync').mockImplementation(() => undefined);
    jest.spyOn(IoHelper, 'scanFilesSync').mockReturnValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('configures and registers commands through migrate', async () => {
    await cli.migrate(configuration);

    expect(cli.checked).toHaveBeenCalledTimes(1);
    expect(yargsInstance.command).toHaveBeenCalledTimes(2);
    expect(yargsInstance.demandCommand).toHaveBeenCalledWith(1, 'Use --help to view available commands.');
    expect(yargsInstance.strictCommands).toHaveBeenCalledWith(true);
    expect(yargsInstance.wrap).toHaveBeenCalledWith(100);
    expect(yargsInstance.help).toHaveBeenCalled();
  });

  it('supports commands without builders and reports yargs failures', async () => {
    await cli.migrate(configuration);

    const commandCalls = yargsInstance.command.mock.calls as unknown as [unknown, unknown, (value: object) => object][];
    expect(commandCalls[0][2]({})).toEqual({});

    const failCalls = yargsInstance.fail.mock.calls as unknown as [(message: string, error?: Error) => void][];
    const fail = failCalls[0][0];
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    fail('bad command');
    fail('bad command', new Error('failure'));

    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(yargsInstance.showHelp).toHaveBeenCalledTimes(2);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('creates migrations and handles runtime file naming', () => {
    Object.assign(cli, { configuration });
    jest.spyOn(Date.prototype, 'getTime').mockReturnValue(123);
    const createFile = jest.spyOn(IoHelper, 'createFileSync');

    void cli.createMigration('User Profile');

    expect(createFile).toHaveBeenCalledWith(
      '/virtual/migrations/123_user-profile.js',
      '123:user-profile',
    );
    expect(exit).toHaveBeenCalledWith(0);

    expect(cli.getExtension()).toBe('.js');
    expect(String(cli.getFileFilter()[0])).toContain('js');
    expect(cli.getFileName('1_first.ts')).toBe('1_first.js');
    expect(cli.normalizeFileName('1_first.ts')).toBe('1_first');
  });

  it('detects TypeScript execution and scans relative migration files', () => {
    Object.assign(cli, { configuration });
    const scanFiles = jest.spyOn(IoHelper, 'scanFilesSync');
    scanFiles.mockReturnValue(['/virtual/migrations/1_first.ts']);
    const originalArgv = process.argv;
    const originalExecArgv = process.execArgv;

    try {
      process.argv = ['node', 'ts-node'];
      process.execArgv = [];
      expect(cli.getExtension()).toBe('.ts');
      expect(cli.getFileName('1_first.js')).toBe('1_first.ts');
      expect(cli.scanFiles()).toEqual(['1_first.ts']);

      process.argv = ['node'];
      process.execArgv = ['ts-node/register'];
      expect(cli.getExtension()).toBe('.ts');

      process.execArgv = [];
      const symbol = Symbol.for('ts-node.register.instance');
      (process as NodeJS.Process & { [key: symbol]: unknown })[symbol] = {};
      expect(cli.getExtension()).toBe('.ts');
      delete (process as NodeJS.Process & { [key: symbol]: unknown })[symbol];
    } finally {
      process.argv = originalArgv;
      process.execArgv = originalExecArgv;
    }
  });
});
