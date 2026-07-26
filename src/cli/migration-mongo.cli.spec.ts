import { MongoClient } from 'mongodb';
import { createRequire } from 'node:module';
import yargs from 'yargs';
import { IoHelper } from '../helpers/io.helper';
import { MigrationMongoCli, MigrationMongoCliInterface } from './migration-mongo.cli';

jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
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

const MIGRATION_PATH = '/virtual/mongo-migrations';
const MONGO_TEMPLATE =
  'class MongoMigrationClass { mongoMigrationCollection mongoMigrationField mongo_migration_index }';

function getCliTarget(): Record<string, (...parameters: unknown[]) => unknown> {
  return MigrationMongoCli as unknown as Record<string, (...parameters: unknown[]) => unknown>;
}

function callCliMethod<R>(method: string, ...parameters: unknown[]): R {
  return getCliTarget()[method].apply(MigrationMongoCli, parameters) as R;
}

function setCliState(values: Record<string, unknown>): void {
  Object.assign(MigrationMongoCli as unknown as Record<string, unknown>, values);
}

function mockCliMethod(method: string, value?: unknown): jest.SpyInstance {
  return jest.spyOn(getCliTarget(), method).mockReturnValue(value);
}

function mockAsyncCliMethod(method: string, value?: unknown): jest.SpyInstance {
  const target = MigrationMongoCli as unknown as Record<string, (...parameters: unknown[]) => Promise<unknown>>;
  return jest.spyOn(target, method).mockResolvedValue(value);
}

describe('MigrationMongoCli', () => {
  const configuration = {
    pathMigration: MIGRATION_PATH,
    uri: 'mongodb://localhost/test',
    database: 'database',
    collection: 'migrations',
  };
  const mockedCreateRequire = createRequire as jest.Mock;
  const mockedLoadModule = mockedCreateRequire.mock.results[0].value as jest.Mock;
  const mockedMongoClient = MongoClient as unknown as jest.Mock;
  const mockedYargs = yargs as unknown as jest.Mock;
  let client: {
    connect: jest.Mock;
    db: jest.Mock;
  };
  let collection: {
    find: jest.Mock;
    findOne: jest.Mock;
    insertOne: jest.Mock;
    deleteOne: jest.Mock;
  };
  let consoleLog: jest.SpyInstance;
  let db: {
    collections: jest.Mock;
    collection: jest.Mock;
  };
  let exit: jest.SpyInstance;
  let migrationExtension: jest.SpyInstance;
  let scanFiles: jest.SpyInstance;
  let yargsInstance: {
    command: jest.Mock;
    demandCommand: jest.Mock;
    strictCommands: jest.Mock;
    fail: jest.Mock;
    help: jest.Mock;
    argv: unknown;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(IoHelper, 'createFileSync').mockImplementation(() => undefined);
    jest.spyOn(IoHelper, 'readFileSync').mockReturnValue(MONGO_TEMPLATE);
    scanFiles = jest.spyOn(IoHelper, 'scanFilesSync').mockReturnValue([]);

    collection = {
      find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue(undefined),
      deleteOne: jest.fn().mockResolvedValue(undefined),
    };
    db = {
      collections: jest.fn().mockResolvedValue([]),
      collection: jest.fn(() => collection),
    };
    client = {
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn(() => db),
    };
    mockedMongoClient.mockReset().mockImplementation(() => client);

    yargsInstance = {
      command: jest.fn(),
      demandCommand: jest.fn(),
      strictCommands: jest.fn(),
      fail: jest.fn(),
      help: jest.fn(),
      argv: {},
    };
    yargsInstance.command.mockReturnValue(yargsInstance);
    yargsInstance.demandCommand.mockReturnValue(yargsInstance);
    yargsInstance.strictCommands.mockReturnValue(yargsInstance);
    yargsInstance.fail.mockReturnValue(yargsInstance);
    yargsInstance.help.mockReturnValue(yargsInstance);
    mockedYargs.mockReset().mockReturnValue(yargsInstance);
    (mockedYargs as jest.Mock & { showHelp: jest.Mock }).showHelp = jest.fn();
    mockedLoadModule.mockReset();

    setCliState({
      client: undefined,
      clientIsConnected: false,
      commandList: callCliMethod('getCommandList'),
      configuration: { ...configuration },
    });
    migrationExtension = mockCliMethod('getMigrationExtension', '.js');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('registers all commands and yargs validation', async () => {
    mockAsyncCliMethod('check');

    await MigrationMongoCli.migrate(configuration);

    expect(yargsInstance.command).toHaveBeenCalledTimes(6);
    expect(yargsInstance.demandCommand).toHaveBeenCalledWith(1, 'Use --help to view available commands.');
    expect(yargsInstance.strictCommands).toHaveBeenCalledWith(true);
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

    await MigrationMongoCli.migrate(configuration);
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
    const operationList = ['drop', 'create', 'up', 'down', 'reset', 'status'];
    const operationSpyList = operationList.map((operation) => mockAsyncCliMethod(operation));

    for (const command of commandList) {
      command.builder?.({ positional });
      if (command.name.startsWith('create')) {
        expect(() => command.handler({})).toThrow('Collection argument is required');
        command.handler({ collection: 'users' });
      } else {
        command.handler({});
      }
    }
    await Promise.resolve();

    expect(positional).toHaveBeenCalledWith('collection', expect.any(Object));
    for (const operationSpy of operationSpyList) {
      expect(operationSpy).toHaveBeenCalled();
    }
  });

  it('reports yargs failures and displays help', async () => {
    mockAsyncCliMethod('check');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await MigrationMongoCli.migrate(configuration);
    const failCalls = yargsInstance.fail.mock.calls as unknown as [(message: string, error?: Error) => void][];
    const fail = failCalls[0][0];
    fail('bad command');
    fail('bad command', new Error('failure'));

    expect(consoleError).toHaveBeenCalledTimes(2);
    expect((mockedYargs as jest.Mock & { showHelp: jest.Mock }).showHelp).toHaveBeenCalledTimes(2);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('creates, connects, and reuses one Mongo client', async () => {
    const first = await callCliMethod<Promise<typeof client>>('getMongoClient');
    const second = await callCliMethod<Promise<typeof client>>('getMongoClient');

    expect(first).toBe(client);
    expect(second).toBe(client);
    expect(mockedMongoClient).toHaveBeenCalledTimes(1);
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('rejects a Mongo connection timeout', async () => {
    client.connect.mockReturnValueOnce(new Promise(() => undefined));
    const connection = callCliMethod<Promise<typeof client>>('getMongoClient');
    const rejection = expect(connection).rejects.toThrow('Connection timeout');

    await jest.advanceTimersByTimeAsync(5000);

    await rejection;
  });

  it('checks the configured database and reports connection failures', async () => {
    await callCliMethod<Promise<void>>('check');
    expect(db.collections).toHaveBeenCalled();

    setCliState({ client: undefined, clientIsConnected: false });
    client.connect.mockRejectedValueOnce(new Error('connection failure'));
    await callCliMethod<Promise<void>>('check');

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('connection failure'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('drops empty and populated databases', async () => {
    setCliState({ client, clientIsConnected: true });
    await callCliMethod<Promise<void>>('drop');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No collections to drop'));

    const first = { collectionName: 'first', drop: jest.fn().mockResolvedValue(undefined) };
    const second = { collectionName: 'second', drop: jest.fn().mockResolvedValue(undefined) };
    db.collections.mockResolvedValueOnce([first, second]);
    await callCliMethod<Promise<void>>('drop');

    expect(first.drop).toHaveBeenCalled();
    expect(second.drop).toHaveBeenCalled();
  });

  it('creates migrations from custom and bundled templates through IoHelper', () => {
    const readFile = jest.spyOn(IoHelper, 'readFileSync');
    const createFile = jest.spyOn(IoHelper, 'createFileSync');
    const customTemplate = '/virtual/templates/mongo.ts';
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

    setCliState({ configuration: { ...configuration } });
    expect(callCliMethod<string>('getTemplate', 1, 'sample-name')).toContain('SampleName_1');
    expect(readFile).toHaveBeenLastCalledWith(expect.stringContaining('migration-mongo.template.ts'));
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
    setCliState({ client, clientIsConnected: true });
    scanFiles.mockReturnValue([
      `${MIGRATION_PATH}/1_first.js`,
      `${MIGRATION_PATH}/2_second.js`,
    ]);
    collection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValue([{ fileName: '1_first.ts' }]),
    });
    const executeMigration = mockAsyncCliMethod('executeMigrationUp');

    await callCliMethod<Promise<void>>('up');
    expect(executeMigration).toHaveBeenCalledWith('2_second.js');

    collection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValue([{ fileName: '1_first' }, { fileName: '2_second' }]),
    });
    await callCliMethod<Promise<void>>('up');

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to up'));
  });

  it('revokes the latest migration and resets all migrations', async () => {
    setCliState({ client, clientIsConnected: true });
    const migrationLog = { _id: 'id', fileName: '1_first' };
    const executeMigration = mockAsyncCliMethod('executeMigrationDown');

    collection.findOne.mockResolvedValueOnce(migrationLog);
    await callCliMethod<Promise<void>>('down');
    expect(executeMigration).toHaveBeenCalledWith(migrationLog);

    collection.findOne.mockResolvedValueOnce(null);
    await callCliMethod<Promise<void>>('down');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to down'));

    collection.find.mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue([migrationLog]) });
    await callCliMethod<Promise<void>>('reset');
    collection.find.mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue([]) });
    await callCliMethod<Promise<void>>('reset');

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to reset'));
  });

  it('reports empty, applied, and pending migration status', async () => {
    setCliState({ client, clientIsConnected: true });
    await callCliMethod<Promise<void>>('status');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migration files found.'));

    scanFiles.mockReturnValue([
      `${MIGRATION_PATH}/1_first.js`,
      `${MIGRATION_PATH}/2_second.js`,
    ]);
    collection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValue([{ fileName: '1_first.ts' }]),
    });
    await callCliMethod<Promise<void>>('status');

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('APPLIED'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('PENDING'));
  });

  it('loads valid migration modules and reports invalid modules', () => {
    class ValidMigration implements MigrationMongoCliInterface {
      public up(): Promise<void> {
        return Promise.resolve();
      }

      public down(): Promise<void> {
        return Promise.resolve();
      }
    }
    mockedLoadModule
      .mockReturnValueOnce({ ValidMigration })
      .mockReturnValueOnce({ value: true })
      .mockImplementationOnce(() => {
        throw new Error('module missing');
      });

    const migration = callCliMethod<MigrationMongoCliInterface>('getMigration', 'valid.js');
    expect(migration).toBeInstanceOf(ValidMigration);
    expect(mockedLoadModule).toHaveBeenNthCalledWith(1, `${MIGRATION_PATH}/valid.js`);

    expect(callCliMethod('getMigration', 'invalid.js')).toBeUndefined();
    expect(callCliMethod('getMigration', 'missing.js')).toBeUndefined();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No valid constructor'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('module missing'));
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('executes migrations in both directions and reports failures', async () => {
    setCliState({ client, clientIsConnected: true });
    const migration = {
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
    };
    const getMigration = mockCliMethod('getMigration', migration);

    await callCliMethod<Promise<void>>('executeMigrationUp', '1_first.js');
    expect(migration.up).toHaveBeenCalledWith(db);
    expect(collection.insertOne).toHaveBeenCalled();

    const migrationLog = { _id: 'id', fileName: '1_first.js' };
    await callCliMethod<Promise<void>>('executeMigrationDown', migrationLog);
    expect(migration.down).toHaveBeenCalledWith(db);
    expect(collection.deleteOne).toHaveBeenCalledWith({ _id: 'id' });

    getMigration.mockReturnValueOnce({
      up: jest.fn().mockRejectedValue(new Error('up failure')),
      down: jest.fn(),
    });
    await callCliMethod<Promise<void>>('executeMigrationUp', '2_second.js');
    getMigration.mockReturnValueOnce({
      up: jest.fn(),
      down: jest.fn().mockRejectedValue(new Error('down failure')),
    });
    await callCliMethod<Promise<void>>('executeMigrationDown', migrationLog);

    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('up failure'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('down failure'));
    expect(exit).toHaveBeenCalledWith(1);
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
