import { createClient, type ClickHouseSettings } from '@clickhouse/client';
import { createRequire } from 'node:module';
import yargs from 'yargs';
import { IoHelper } from '../helpers/io.helper';
import { MigrationClickhouseCli, type MigrationClickhouseCliInterface } from './migration-clickhouse.cli';

jest.mock('@clickhouse/client', () => ({
  createClient: jest.fn(),
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

const MIGRATION_PATH = '/virtual/clickhouse-migrations';
const SEEDER_PATH = '/virtual/clickhouse-seeders';
const CLICKHOUSE_TEMPLATE = 'class ClickhouseMigrationClass { clickhouseMigrationTable clickhouseMigrationColumn }';

function getCliTarget(): Record<string, (...parameters: unknown[]) => unknown> {
  return MigrationClickhouseCli as unknown as Record<string, (...parameters: unknown[]) => unknown>;
}

function callCliMethod<R>(method: string, ...parameters: unknown[]): R {
  return getCliTarget()[method].apply(MigrationClickhouseCli, parameters) as R;
}

function setCliState(values: Record<string, unknown>): void {
  Object.assign(MigrationClickhouseCli as unknown as Record<string, unknown>, values);
}

function mockCliMethod(method: string, value?: unknown): jest.SpyInstance {
  return jest.spyOn(getCliTarget(), method).mockReturnValue(value);
}

function mockAsyncCliMethod(method: string, value?: unknown): jest.SpyInstance {
  const target = MigrationClickhouseCli as unknown as Record<string, (...parameters: unknown[]) => Promise<unknown>>;
  return jest.spyOn(target, method).mockResolvedValue(value);
}

describe('MigrationClickhouseCli', () => {
  const configuration = {
    pathMigration: MIGRATION_PATH,
    pathSeeder: SEEDER_PATH,
    uri: 'http://localhost:8123',
    database: 'analytics',
    username: 'user',
    password: 'password',
    tableMigration: 'app_migration',
    tableSeeder: 'app_seeder',
    request_timeout: 45000,
    clickhouse_settings: {
      wait_end_of_query: 1,
      alter_sync: '2',
    } satisfies ClickHouseSettings,
  };
  const mockedCreateRequire = createRequire as jest.Mock;
  const mockedLoadModule = mockedCreateRequire.mock.results[0].value as jest.Mock;
  const mockedCreateClient = createClient as jest.Mock;
  const mockedYargs = yargs as unknown as jest.Mock;
  let client: {
    command: jest.Mock;
    insert: jest.Mock;
    query: jest.Mock;
  };
  let consoleLog: jest.SpyInstance;
  let exit: jest.SpyInstance;
  let scanFiles: jest.SpyInstance;
  let yargsInstance: {
    command: jest.Mock;
    demandCommand: jest.Mock;
    strictCommands: jest.Mock;
    fail: jest.Mock;
    help: jest.Mock;
    showHelp: jest.Mock;
    wrap: jest.Mock;
    argv: unknown;
  };

  beforeEach(() => {
    exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(IoHelper, 'createFileSync').mockImplementation(() => undefined);
    jest.spyOn(IoHelper, 'readFileSync').mockReturnValue(CLICKHOUSE_TEMPLATE);
    scanFiles = jest.spyOn(IoHelper, 'scanFilesSync').mockReturnValue([]);

    client = {
      command: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue([]) }),
    };
    mockedCreateClient.mockReset().mockReturnValue(client);
    mockedLoadModule.mockReset();

    yargsInstance = {
      command: jest.fn(),
      demandCommand: jest.fn(),
      strictCommands: jest.fn(),
      fail: jest.fn(),
      help: jest.fn(),
      showHelp: jest.fn(),
      wrap: jest.fn(),
      argv: {},
    };
    yargsInstance.command.mockReturnValue(yargsInstance);
    yargsInstance.demandCommand.mockReturnValue(yargsInstance);
    yargsInstance.strictCommands.mockReturnValue(yargsInstance);
    yargsInstance.fail.mockReturnValue(yargsInstance);
    yargsInstance.help.mockReturnValue(yargsInstance);
    yargsInstance.wrap.mockReturnValue(yargsInstance);
    mockedYargs.mockReset().mockReturnValue(yargsInstance);

    setCliState({
      client: undefined,
      commandList: callCliMethod('getCommandList'),
      configuration: { ...configuration },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the ClickHouse migration commands', async () => {
    mockAsyncCliMethod('check');

    await MigrationClickhouseCli.migrate(configuration);

    expect(yargsInstance.command).toHaveBeenCalledTimes(11);
    expect(yargsInstance.demandCommand).toHaveBeenCalledWith(1, 'Use --help to view available commands.');
    expect(yargsInstance.strictCommands).toHaveBeenCalledWith(true);
    expect(yargsInstance.wrap).toHaveBeenCalledWith(100);
    expect(yargsInstance.help).toHaveBeenCalled();
  });

  it('configures and dispatches every command handler', async () => {
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

  it('delegates seeder commands with the seeder path and history table', async () => {
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
    expect(MigrationClickhouseCli).toMatchObject({
      configuration: {
        pathMigration: SEEDER_PATH,
        tableMigration: 'app_seeder',
      },
    });
  });

  it('creates, checks, and reuses one ClickHouse client', async () => {
    const first = callCliMethod<typeof client>('getClickhouseClient');
    const second = callCliMethod<typeof client>('getClickhouseClient');
    await callCliMethod<Promise<void>>('check');

    expect(first).toBe(client);
    expect(second).toBe(client);
    expect(mockedCreateClient).toHaveBeenCalledTimes(1);
    expect(mockedCreateClient).toHaveBeenCalledWith({
      url: configuration.uri,
      database: configuration.database,
      username: configuration.username,
      password: configuration.password,
      request_timeout: configuration.request_timeout,
      clickhouse_settings: {
        wait_end_of_query: 1,
        alter_sync: '2',
      },
    });
    expect(client.query).toHaveBeenCalledWith({ query: 'SELECT 1 AS value', format: 'JSONEachRow' });
  });

  it('reports ClickHouse connection failures', async () => {
    client.query.mockRejectedValueOnce(new Error('connection failure'));

    await callCliMethod<Promise<void>>('check');

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('connection failure'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('drops empty and populated ClickHouse databases', async () => {
    await callCliMethod<Promise<void>>('drop');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No tables to drop'));
    expect(client.command).not.toHaveBeenCalled();

    client.query.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue([{ tableName: 'app_migration' }, { tableName: 'events' }]),
    });
    await callCliMethod<Promise<void>>('drop');

    expect(client.command).toHaveBeenCalledWith({ query: 'DROP TABLE IF EXISTS `app_migration`' });
    expect(client.command).toHaveBeenCalledWith({ query: 'DROP TABLE IF EXISTS `events`' });
  });

  it('creates migrations from custom and bundled templates', () => {
    const readFile = jest.spyOn(IoHelper, 'readFileSync');
    const createFile = jest.spyOn(IoHelper, 'createFileSync');
    const customTemplate = '/virtual/templates/clickhouse.ts';
    setCliState({ configuration: { ...configuration, template: customTemplate } });
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
    expect(readFile).toHaveBeenLastCalledWith(expect.stringContaining('migration-clickhouse.template.ts'));
  });

  it('applies only pending migrations and reports an empty queue', async () => {
    mockAsyncCliMethod('createMigrationTable');
    mockAsyncCliMethod('getAppliedMigrationList', [{ appliedAt: '2026-09-16', fileName: '1_first' }]);
    const executeMigration = mockAsyncCliMethod('executeMigrationUp');
    scanFiles.mockReturnValue([`${MIGRATION_PATH}/1_first.js`, `${MIGRATION_PATH}/2_second.js`]);

    await callCliMethod<Promise<void>>('up');

    expect(executeMigration).toHaveBeenCalledWith(client, '2_second.js');

    executeMigration.mockClear();
    mockAsyncCliMethod('getAppliedMigrationList', [
      { appliedAt: '2026-09-16', fileName: '1_first' },
      { appliedAt: '2026-09-16', fileName: '2_second' },
    ]);
    await callCliMethod<Promise<void>>('up');

    expect(executeMigration).not.toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to up'));
  });

  it('revokes the latest migration and resets all migrations', async () => {
    mockAsyncCliMethod('createMigrationTable');
    const migrations = [
      { appliedAt: '2026-09-16 12:00:00.000', fileName: '2_second' },
      { appliedAt: '2026-09-16 11:00:00.000', fileName: '1_first' },
    ];
    const appliedList = mockAsyncCliMethod('getAppliedMigrationList', migrations);
    const executeMigration = mockAsyncCliMethod('executeMigrationDown');

    await callCliMethod<Promise<void>>('down');
    expect(executeMigration).toHaveBeenCalledWith(client, '`app_migration`', migrations[0]);

    executeMigration.mockClear();
    await callCliMethod<Promise<void>>('reset');
    expect(executeMigration).toHaveBeenCalledTimes(2);

    appliedList.mockResolvedValueOnce([]);
    await callCliMethod<Promise<void>>('down');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to down'));
  });

  it('reports applied and pending migration status', async () => {
    mockAsyncCliMethod('createMigrationTable');
    mockAsyncCliMethod('getAppliedMigrationList', [{ appliedAt: '2026-09-16', fileName: '1_first.ts' }]);
    scanFiles.mockReturnValue([`${MIGRATION_PATH}/1_first.js`, `${MIGRATION_PATH}/2_second.js`]);

    await callCliMethod<Promise<void>>('status');

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('APPLIED'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('PENDING'));
  });

  it('loads valid migration modules and reports invalid modules', () => {
    class ValidMigration implements MigrationClickhouseCliInterface {
      public up(): Promise<void> {
        return Promise.resolve();
      }

      public down(): Promise<void> {
        return Promise.resolve();
      }
    }
    mockedLoadModule
      .mockReturnValueOnce({ default: { ValidMigration } })
      .mockReturnValueOnce({ value: true })
      .mockImplementationOnce(() => {
        throw new Error('module missing');
      });

    const migration = callCliMethod<MigrationClickhouseCliInterface>('getMigration', 'valid.js');
    expect(migration).toBeInstanceOf(ValidMigration);
    expect(mockedLoadModule).toHaveBeenNthCalledWith(1, `${MIGRATION_PATH}/valid.js`);

    expect(callCliMethod('getMigration', 'invalid.js')).toBeUndefined();
    expect(callCliMethod('getMigration', 'missing.js')).toBeUndefined();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No valid constructor'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('module missing'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('executes migrations in both directions and records their state', async () => {
    const migration = {
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
    };
    mockCliMethod('getMigration', migration);

    await callCliMethod<Promise<void>>('executeMigrationUp', client, '1_first.js');

    expect(migration.up).toHaveBeenCalledWith(client, 'analytics');
    const insertCalls = client.insert.mock.calls as unknown as Array<
      [
        {
          table: string;
          values: { applied_at: string; filename: string }[];
          format: string;
        },
      ]
    >;
    const insertCall = insertCalls[0]?.[0];
    expect(insertCall.table).toBe('app_migration');
    expect(insertCall.values[0]?.filename).toBe('1_first');
    expect(typeof insertCall.values[0]?.applied_at).toBe('string');
    expect(insertCall.format).toBe('JSONEachRow');

    const migrationLog = { appliedAt: '2026-09-16 12:00:00.000', fileName: '1_first.js' };
    await callCliMethod<Promise<void>>('executeMigrationDown', client, '`app_migration`', migrationLog);

    expect(migration.down).toHaveBeenCalledWith(client, 'analytics');
    expect(client.command).toHaveBeenCalledWith({
      query: 'ALTER TABLE `app_migration` DELETE WHERE filename = {filename:String}',
      query_params: { filename: '1_first' },
      clickhouse_settings: { mutations_sync: '2' },
    });
  });

  it('records a migration only after its DDL and verification finish', async () => {
    let finishMigration!: () => void;
    const pendingMigration = new Promise<void>((resolve) => {
      finishMigration = resolve;
    });
    mockCliMethod('getMigration', {
      up: jest.fn().mockReturnValue(pendingMigration),
    });

    const execution = callCliMethod<Promise<void>>('executeMigrationUp', client, '1_first.ts');
    await Promise.resolve();

    expect(client.insert).not.toHaveBeenCalled();

    finishMigration();
    await execution;

    expect(client.insert).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();
  });

  it.each(['DDL replication timeout', 'Migration verification failed'])(
    'fails without recording a migration on %s',
    async (message) => {
      mockCliMethod('getMigration', {
        up: jest.fn().mockRejectedValue(new Error(message)),
      });

      await callCliMethod<Promise<void>>('executeMigrationUp', client, '1_first.ts');

      expect(client.insert).not.toHaveBeenCalled();
      expect(exit).toHaveBeenCalledWith(1);
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining(message));
    },
  );

  it('creates and reads the migration history table', async () => {
    const rows = [{ appliedAt: '2026-09-16 12:00:00.000', fileName: '1_first' }];
    client.query.mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(rows) });

    await callCliMethod<Promise<void>>('createMigrationTable', client, '`app_migration`');
    const result = await callCliMethod<Promise<typeof rows>>(
      'getAppliedMigrationList',
      client,
      '`app_migration`',
      false,
    );

    const commandCalls = client.command.mock.calls as unknown as Array<[{ query: string }]>;
    const queryCalls = client.query.mock.calls as unknown as Array<[{ query: string; format: string }]>;
    const createCall = commandCalls[0]?.[0];
    const queryCall = queryCalls[0]?.[0];
    expect(createCall.query).toContain('CREATE TABLE IF NOT EXISTS');
    expect(queryCall.query).toContain('ORDER BY applied_at ASC, filename ASC');
    expect(queryCall.format).toBe('JSONEachRow');
    expect(result).toEqual(rows);
  });

  it('validates migration table identifiers', () => {
    expect(callCliMethod('quoteIdentifier', 'app_migration')).toBe('`app_migration`');
    expect(() => callCliMethod('quoteIdentifier', 'app-migration')).toThrow(
      'Invalid ClickHouse identifier: app-migration',
    );
  });
});
