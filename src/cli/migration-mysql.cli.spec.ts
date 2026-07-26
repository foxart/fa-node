import { type Connection, createConnection } from 'mysql2/promise';
import { createRequire } from 'node:module';
import yargs from 'yargs';
import { IoHelper } from '../helpers/io.helper';
import { MigrationMysqlCli, MigrationMysqlCliInterface } from './migration-mysql.cli';

jest.mock('mysql2/promise', () => ({
  createConnection: jest.fn(),
}));

jest.mock('node:module', () => ({
  createRequire: jest.fn(() => jest.fn()),
}));

jest.mock('yargs', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('yargs/helpers', () => ({
  hideBin: jest.fn((value: string[]) => value.slice(2)),
}));

const MIGRATION_PATH = '/virtual/mysql-migrations';
const SEEDER_PATH = '/virtual/mysql-seeders';
const MYSQL_TEMPLATE = [
  'export class MysqlMigrationClassCreateTable {',
  '  public async up(connection: Connection) { mysqlMigrationTable mysqlMigrationColumn mysql_migration_index }',
  '  public async down(connection: Connection) { mysqlMigrationRenamedTable mysqlMigrationRenamedColumn }',
  '  mysqlMigrationForeignTable mysqlMigrationForeignColumn',
  '}',
].join('\n');

function getCliTarget(): Record<string, (...parameters: unknown[]) => unknown> {
  return MigrationMysqlCli as unknown as Record<string, (...parameters: unknown[]) => unknown>;
}

function callCliMethod<R>(method: string, ...parameters: unknown[]): R {
  return getCliTarget()[method].apply(MigrationMysqlCli, parameters) as R;
}

function setCliState(values: Record<string, unknown>): void {
  Object.assign(MigrationMysqlCli as unknown as Record<string, unknown>, values);
}

function mockCliMethod(method: string, value?: unknown): jest.SpyInstance {
  return jest.spyOn(getCliTarget(), method).mockReturnValue(value);
}

function mockAsyncCliMethod(method: string, value?: unknown): jest.SpyInstance {
  const target = MigrationMysqlCli as unknown as Record<string, (...parameters: unknown[]) => Promise<unknown>>;
  return jest.spyOn(target, method).mockResolvedValue(value);
}

describe('MigrationMysqlCli', () => {
  const configuration = {
    pathMigration: MIGRATION_PATH,
    pathSeeder: SEEDER_PATH,
    uri: 'mysql://user:password@localhost:3306/database',
    database: 'database',
    tableMigration: 'tableMigration',
    tableSeeder: 'tableSeeder',
  };
  const mockedCreateConnection = createConnection as jest.Mock;
  const mockedCreateRequire = createRequire as jest.Mock;
  const mockedLoadModule = mockedCreateRequire.mock.results[0].value as jest.Mock;
  const mockedYargs = yargs as unknown as jest.Mock;
  let connection: {
    query: jest.Mock;
    execute: jest.Mock;
  };
  let consoleLog: jest.SpyInstance;
  let execute: jest.Mock;
  let exit: jest.SpyInstance;
  let migrationExtension: jest.SpyInstance;
  let query: jest.Mock;
  let scanFiles: jest.SpyInstance;
  let yargsInstance: {
    command: jest.Mock;
    demandCommand: jest.Mock;
    fail: jest.Mock;
    help: jest.Mock;
    showHelp: jest.Mock;
    strictCommands: jest.Mock;
    wrap: jest.Mock;
    argv: unknown;
  };

  beforeEach(() => {
    exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(IoHelper, 'createFileSync').mockImplementation(() => undefined);
    jest.spyOn(IoHelper, 'readFileSync').mockReturnValue(MYSQL_TEMPLATE);
    scanFiles = jest.spyOn(IoHelper, 'scanFilesSync').mockReturnValue([]);

    query = jest.fn().mockResolvedValue([[]]);
    execute = jest.fn((sql: string) => {
      if (sql.includes('GET_LOCK')) {
        return Promise.resolve([[{ acquired: 1 }]]);
      }
      return Promise.resolve([[]]);
    });
    connection = { query, execute };
    mockedCreateConnection.mockReset().mockResolvedValue(connection);

    yargsInstance = {
      command: jest.fn(),
      demandCommand: jest.fn(),
      fail: jest.fn(),
      help: jest.fn(),
      showHelp: jest.fn(),
      strictCommands: jest.fn(),
      wrap: jest.fn(),
      argv: {},
    };
    yargsInstance.command.mockReturnValue(yargsInstance);
    yargsInstance.demandCommand.mockReturnValue(yargsInstance);
    yargsInstance.fail.mockReturnValue(yargsInstance);
    yargsInstance.help.mockReturnValue(yargsInstance);
    yargsInstance.strictCommands.mockReturnValue(yargsInstance);
    yargsInstance.wrap.mockReturnValue(yargsInstance);
    mockedYargs.mockReset().mockReturnValue(yargsInstance);
    mockedLoadModule.mockReset();

    setCliState({
      commandList: callCliMethod('getCommandList'),
      configuration: { ...configuration },
      connection: undefined,
    });
    migrationExtension = mockCliMethod('getMigrationExtension', '.js');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers all commands and yargs validation', async () => {
    mockAsyncCliMethod('check');

    await MigrationMysqlCli.migrate(configuration);

    expect(yargsInstance.command).toHaveBeenCalledTimes(11);
    expect(yargsInstance.demandCommand).toHaveBeenCalledWith(1, 'Use --help to view available commands.');
    expect(yargsInstance.strictCommands).toHaveBeenCalledWith(true);
    expect(yargsInstance.wrap).toHaveBeenCalledWith(100);
    expect(yargsInstance.help).toHaveBeenCalled();
  });

  it('supports commands without builders', async () => {
    mockAsyncCliMethod('check');
    setCliState({
      commandList: [
        {
          name: 'status',
          desc: 'status',
          handler: jest.fn(),
        },
      ],
    });

    await MigrationMysqlCli.migrate(configuration);
    const commandCalls = yargsInstance.command.mock.calls as unknown as [unknown, unknown, (value: object) => object][];
    const builder = commandCalls[0][2];
    const instance = {};

    expect(builder(instance)).toBe(instance);
  });

  it('configures and dispatches command handlers', async () => {
    const commandList = callCliMethod<
      Array<{
        name: string;
        builder?: (value: { positional: jest.Mock }) => void;
        handler: (value: Record<string, unknown>) => void;
      }>
    >('getCommandList');
    const positional = jest.fn();
    const operationList = [
      'drop',
      'create',
      'up',
      'down',
      'reset',
      'status',
      'seederCreate',
      'seederUp',
      'seederDown',
      'seederReset',
      'seederStatus',
    ];
    const operationSpyList = operationList.map((operation) => mockAsyncCliMethod(operation));

    for (const command of commandList) {
      command.builder?.({ positional });
      if (command.name.endsWith('<migration>')) {
        expect(() => command.handler({})).toThrow('Migration argument is required');
        command.handler({ migration: 'users' });
      } else {
        command.handler({});
      }
    }
    await Promise.resolve();

    expect(positional).toHaveBeenCalledWith('migration', expect.any(Object));
    expect(positional).toHaveBeenCalledTimes(2);
    for (const operationSpy of operationSpyList) {
      expect(operationSpy).toHaveBeenCalled();
    }
  });

  it('delegates seeder commands with the seeder path and table', async () => {
    const create = mockAsyncCliMethod('create');
    const up = mockAsyncCliMethod('up');
    const down = mockAsyncCliMethod('down');
    const reset = mockAsyncCliMethod('reset');
    const status = mockAsyncCliMethod('status');

    await callCliMethod<Promise<void>>('seederCreate', 'users');
    await callCliMethod<Promise<void>>('seederUp');
    await callCliMethod<Promise<void>>('seederDown');
    await callCliMethod<Promise<void>>('seederReset');
    await callCliMethod<Promise<void>>('seederStatus');

    expect(create).toHaveBeenCalledWith('users');
    expect(up).toHaveBeenCalledTimes(1);
    expect(down).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledTimes(1);
    expect(MigrationMysqlCli).toMatchObject({
      configuration: {
        pathMigration: SEEDER_PATH,
        tableMigration: 'tableSeeder',
      },
    });
  });

  it('reports yargs failures and displays help', async () => {
    mockAsyncCliMethod('check');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await MigrationMysqlCli.migrate(configuration);
    const failCalls = yargsInstance.fail.mock.calls as unknown as [(message: string, error?: Error) => void][];
    const fail = failCalls[0][0];
    fail('bad command');
    fail('bad command', new Error('failure'));

    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(yargsInstance.showHelp).toHaveBeenCalledTimes(2);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('creates and reuses one MySQL connection', async () => {
    const first = await callCliMethod<Promise<typeof connection>>('getMysqlConnection');
    const second = await callCliMethod<Promise<typeof connection>>('getMysqlConnection');

    expect(first).toBe(connection);
    expect(second).toBe(connection);
    expect(mockedCreateConnection).toHaveBeenCalledTimes(1);
    expect(mockedCreateConnection).toHaveBeenCalledWith({
      database: 'database',
      connectTimeout: 5000,
      multipleStatements: true,
      timezone: 'Z',
      uri: configuration.uri,
    });
  });

  it('checks the configured database and reports connection failures', async () => {
    await callCliMethod<Promise<void>>('check');
    expect(query).toHaveBeenCalledWith('SELECT 1');

    setCliState({ connection: undefined });
    mockedCreateConnection.mockRejectedValueOnce(new Error('connection failure'));
    await callCliMethod<Promise<void>>('check');

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('connection failure'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('drops empty and populated databases', async () => {
    await callCliMethod<Promise<void>>('drop');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No tables to drop'));
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS'));

    execute.mockImplementation((sql: string) => {
      if (sql.includes('GET_LOCK')) {
        return Promise.resolve([[{ acquired: 1 }]]);
      }
      if (sql.includes('information_schema.TABLES')) {
        return Promise.resolve([[{ tableName: 'auth_sessions' }, { tableName: 'users' }]]);
      }
      return Promise.resolve([[]]);
    });
    await callCliMethod<Promise<void>>('drop');

    expect(query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 0');
    expect(query).toHaveBeenCalledWith('DROP TABLE IF EXISTS `auth_sessions`');
    expect(query).toHaveBeenCalledWith('DROP TABLE IF EXISTS `users`');
    expect(query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 1');
  });

  it('creates migrations from custom and bundled templates through IoHelper', () => {
    const readFile = jest.spyOn(IoHelper, 'readFileSync');
    const createFile = jest.spyOn(IoHelper, 'createFileSync');
    const customTemplate = '/virtual/templates/mysql.ts';
    setCliState({
      configuration: {
        ...configuration,
        template: customTemplate,
      },
    });
    jest.spyOn(Date.prototype, 'getTime').mockReturnValue(123);

    callCliMethod<void>('create', 'User Profile');

    expect(readFile).toHaveBeenCalledWith(customTemplate);
    expect(createFile).toHaveBeenCalledWith(
      `${MIGRATION_PATH}/123_user-profile.js`,
      expect.stringContaining('UserProfile_123'),
    );
    expect(createFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('user_profile_123'));

    setCliState({ configuration: { ...configuration } });
    expect(callCliMethod<string>('getTemplate', 1, 'sample-name')).toContain('SampleName_1');
    expect(readFile).toHaveBeenLastCalledWith(expect.stringContaining('migration-mysql.template.ts'));
  });

  it('reports template read failures', () => {
    jest.spyOn(IoHelper, 'readFileSync').mockImplementationOnce(() => {
      throw new Error('template missing');
    });

    expect(callCliMethod('getTemplate', 1, 'sample')).toBeUndefined();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('template missing'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('applies only pending migrations and reports an empty queue', async () => {
    const firstMigration = {
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn(),
    };
    const secondMigration = {
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn(),
    };
    mockCliMethod('getMigration').mockImplementation((fileName: string) =>
      fileName.startsWith('1_') ? firstMigration : secondMigration,
    );
    scanFiles.mockReturnValue([`${MIGRATION_PATH}/1_first.js`, `${MIGRATION_PATH}/2_second.js`]);
    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id')) {
        return Promise.resolve([[{ appliedAt: new Date(), fileName: '1_first', id: 1 }]]);
      }
      return Promise.resolve([[]]);
    });

    await callCliMethod<Promise<void>>('up');

    expect(firstMigration.up).not.toHaveBeenCalled();
    expect(secondMigration.up).toHaveBeenCalledWith(connection);
    expect(secondMigration.up).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith('INSERT INTO `tableMigration` (filename) VALUES (?)', ['2_second']);
    expect(scanFiles).toHaveBeenCalledWith(MIGRATION_PATH, { filter: [expect.any(RegExp)] });

    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id')) {
        return Promise.resolve([
          [
            { appliedAt: new Date(), fileName: '1_first', id: 1 },
            { appliedAt: new Date(), fileName: '2_second', id: 2 },
          ],
        ]);
      }
      return Promise.resolve([[]]);
    });
    await callCliMethod<Promise<void>>('up');

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to up'));
  });

  it('revokes the latest migration and resets all migrations', async () => {
    const down = jest.fn().mockResolvedValue(undefined);
    mockCliMethod('getMigration', { up: jest.fn(), down });
    let migrationList = [{ appliedAt: new Date(), fileName: '2_second', id: 2 }];
    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id')) {
        return Promise.resolve([migrationList]);
      }
      return Promise.resolve([[]]);
    });

    await callCliMethod<Promise<void>>('down');
    expect(down).toHaveBeenCalledWith(connection);
    expect(execute).toHaveBeenCalledWith('DELETE FROM `tableMigration` WHERE id = ?', [2]);

    migrationList = [];
    await callCliMethod<Promise<void>>('down');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to down'));

    migrationList = [
      { appliedAt: new Date(), fileName: '2_second', id: 2 },
      { appliedAt: new Date(), fileName: '1_first', id: 1 },
    ];
    await callCliMethod<Promise<void>>('reset');
    migrationList = [];
    await callCliMethod<Promise<void>>('reset');

    expect(execute).toHaveBeenCalledWith('DELETE FROM `tableMigration` WHERE id = ?', [1]);
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to reset'));
  });

  it('reports empty, applied, and pending migration status', async () => {
    await callCliMethod<Promise<void>>('status');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migration files found.'));

    scanFiles.mockReturnValue([`${MIGRATION_PATH}/1_first.js`, `${MIGRATION_PATH}/2_second.js`]);
    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id')) {
        return Promise.resolve([[{ appliedAt: new Date(), fileName: '1_first', id: 1 }]]);
      }
      return Promise.resolve([[]]);
    });
    await callCliMethod<Promise<void>>('status');

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('APPLIED'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('PENDING'));
  });

  it('loads valid migration modules and reports invalid modules', () => {
    class ValidMigration implements MigrationMysqlCliInterface {
      public up(_connection: Connection): Promise<void> {
        return Promise.resolve();
      }

      public down(_connection: Connection): Promise<void> {
        return Promise.resolve();
      }
    }
    mockedLoadModule
      .mockReturnValueOnce({ ValidMigration })
      .mockReturnValueOnce({ value: true })
      .mockImplementationOnce(() => {
        throw new Error('module missing');
      });

    const migration = callCliMethod<MigrationMysqlCliInterface>('getMigration', 'valid.js');
    expect(migration).toBeInstanceOf(ValidMigration);
    expect(mockedLoadModule).toHaveBeenNthCalledWith(1, `${MIGRATION_PATH}/valid.js`);

    expect(callCliMethod('getMigration', 'invalid.js')).toBeUndefined();
    expect(callCliMethod('getMigration', 'missing.js')).toBeUndefined();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No valid constructor'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('module missing'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('executes migrations in both directions and reports failures', async () => {
    const migration = {
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
    };
    const getMigration = mockCliMethod('getMigration', migration);

    await callCliMethod<Promise<void>>('executeMigrationUp', connection, '`tableMigration`', '1_first.js');
    expect(migration.up).toHaveBeenCalledWith(connection);
    expect(execute).toHaveBeenCalledWith('INSERT INTO `tableMigration` (filename) VALUES (?)', ['1_first']);

    const migrationLog = { appliedAt: new Date(), fileName: '1_first', id: 1 };
    await callCliMethod<Promise<void>>('executeMigrationDown', connection, '`tableMigration`', migrationLog);
    expect(migration.down).toHaveBeenCalledWith(connection);
    expect(execute).toHaveBeenCalledWith('DELETE FROM `tableMigration` WHERE id = ?', [1]);

    getMigration.mockReturnValueOnce({
      up: jest.fn().mockRejectedValue(new Error('up failure')),
      down: jest.fn(),
    });
    await callCliMethod<Promise<void>>('executeMigrationUp', connection, '`tableMigration`', '2_second.js');
    getMigration.mockReturnValueOnce({
      up: jest.fn(),
      down: jest.fn().mockRejectedValue(new Error('down failure')),
    });
    await callCliMethod<Promise<void>>('executeMigrationDown', connection, '`tableMigration`', migrationLog);

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('up failure'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('down failure'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('validates identifiers and migration locks', async () => {
    expect(callCliMethod('quoteIdentifier', 'tableMigration')).toBe('`tableMigration`');
    expect(() => callCliMethod('quoteIdentifier', 'app-migration')).toThrow('Invalid MySQL identifier: app-migration');

    execute.mockResolvedValueOnce([[{ acquired: 0 }]]);
    await expect(callCliMethod<Promise<string>>('acquireLock', connection)).rejects.toThrow(
      'Timed out waiting for migration lock database:tableMigration',
    );
  });

  it('selects runtime extensions and normalizes migration names', () => {
    migrationExtension.mockRestore();
    const originalArgv = process.argv;
    const originalExecArgv = process.execArgv;
    const symbol = Symbol.for('ts-node.register.instance');

    try {
      process.argv = ['node', 'script'];
      process.execArgv = [];
      delete (process as NodeJS.Process & { [key: symbol]: unknown })[symbol];
      expect(callCliMethod('getMigrationExtension')).toBe('.js');
      expect(String(callCliMethod<RegExp[]>('getMigrationFileFilter')[0])).toContain('js');
      expect(callCliMethod('getMigrationFileName', '1_first.ts')).toBe('1_first.js');

      process.argv = ['node', 'ts-node'];
      expect(callCliMethod('getMigrationExtension')).toBe('.ts');
      expect(String(callCliMethod<RegExp[]>('getMigrationFileFilter')[0])).toContain('ts');

      process.argv = ['node'];
      process.execArgv = ['ts-node/register'];
      expect(callCliMethod('isTypeScriptExecution')).toBe(true);

      process.execArgv = [];
      (process as NodeJS.Process & { [key: symbol]: unknown })[symbol] = {};
      expect(callCliMethod('isTypeScriptExecution')).toBe(true);
      expect(callCliMethod('normalizeMigrationFileName', '1_first.ts')).toBe('1_first');
    } finally {
      process.argv = originalArgv;
      process.execArgv = originalExecArgv;
      delete (process as NodeJS.Process & { [key: symbol]: unknown })[symbol];
    }
  });
});
