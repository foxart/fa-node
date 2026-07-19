import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MongoClient } from 'mongodb';
import yargs from 'yargs';

import { MigrationMongoCli, MigrationMongoCliInterface } from './migration-mongo.cli';

jest.mock('mongodb', () => ({
  MongoClient: jest.fn(),
}));

jest.mock('yargs', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('yargs/helpers', () => ({
  hideBin: jest.fn((value: string[]) => value.slice(2)),
}));

function invoke<R>(method: string, ...args: unknown[]): R {
  const callback = (
    MigrationMongoCli as unknown as Record<string, (...parameters: unknown[]) => unknown>
  )[method];
  return callback.apply(MigrationMongoCli, args) as R;
}

function assign(values: Record<string, unknown>): void {
  Object.assign(MigrationMongoCli as unknown as Record<string, unknown>, values);
}

function mockAsyncMethod(method: string, value?: unknown): jest.SpyInstance {
  const target = MigrationMongoCli as unknown as Record<string, (...parameters: unknown[]) => Promise<unknown>>;
  return jest.spyOn(target, method).mockResolvedValue(value);
}

describe('MigrationMongoCli', () => {
  const mockedMongoClient = MongoClient as unknown as jest.Mock;
  const mockedYargs = yargs as unknown as jest.Mock;
  let temporaryDirectory: string;
  let exit: jest.SpyInstance;
  let collection: {
    find: jest.Mock;
    findOne: jest.Mock;
    insertOne: jest.Mock;
    deleteOne: jest.Mock;
  };
  let db: {
    collections: jest.Mock;
    collection: jest.Mock;
  };
  let client: {
    connect: jest.Mock;
    db: jest.Mock;
  };
  let yargsInstance: {
    command: jest.Mock;
    demandCommand: jest.Mock;
    strictCommands: jest.Mock;
    fail: jest.Mock;
    help: jest.Mock;
    showHelp: jest.Mock;
    argv: unknown;
  };
  let consoleLog: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fa-node-migration-'));
    exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);

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
    mockedMongoClient.mockImplementation(() => client);

    yargsInstance = {
      command: jest.fn(),
      demandCommand: jest.fn(),
      strictCommands: jest.fn(),
      fail: jest.fn(),
      help: jest.fn(),
      showHelp: jest.fn(),
      argv: {},
    };
    yargsInstance.command.mockReturnValue(yargsInstance);
    yargsInstance.demandCommand.mockReturnValue(yargsInstance);
    yargsInstance.strictCommands.mockReturnValue(yargsInstance);
    yargsInstance.fail.mockReturnValue(yargsInstance);
    yargsInstance.help.mockReturnValue(yargsInstance);
    mockedYargs.mockReturnValue(yargsInstance);
    (mockedYargs as jest.Mock & { showHelp: jest.Mock }).showHelp = jest.fn();

    assign({
      client: undefined,
      clientIsConnected: false,
      commandList: invoke('getCommandList'),
      configuration: {
        uri: 'mongodb://localhost/test',
        database: 'database',
        collection: 'migrations',
        path: temporaryDirectory,
      },
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    jest.restoreAllMocks();
    mockedMongoClient.mockReset();
    mockedYargs.mockReset();
  });

  it('should register every CLI command', async () => {
    mockAsyncMethod('check');

    await MigrationMongoCli.migrate({
      uri: 'mongodb://localhost/test',
      database: 'database',
      collection: 'migrations',
      path: temporaryDirectory,
    });

    expect(yargsInstance.command).toHaveBeenCalledTimes(6);
    expect(yargsInstance.demandCommand).toHaveBeenCalled();
    expect(yargsInstance.strictCommands).toHaveBeenCalledWith(true);
    expect(yargsInstance.help).toHaveBeenCalled();
  });

  it('should register commands without builders', async () => {
    mockAsyncMethod('check');
    assign({
      commandList: [
        {
          name: 'status',
          desc: 'status',
          handler: jest.fn(),
        },
      ],
    });

    await MigrationMongoCli.migrate({
      uri: 'mongodb://localhost/test',
      database: 'database',
      collection: 'migrations',
      path: temporaryDirectory,
    });
    const commandCalls = yargsInstance.command.mock.calls as unknown[][];
    const builder = commandCalls[0][2] as (value: object) => object;
    const instance = {};

    expect(builder(instance)).toBe(instance);
  });

  it('should configure and dispatch command handlers', async () => {
    const commandList = invoke<
      Array<{
        name: string;
        builder?: (value: { positional: jest.Mock }) => void;
        handler: (value: Record<string, unknown>) => void;
      }>
    >('getCommandList');
    const positional = jest.fn();
    const operationList = ['drop', 'create', 'up', 'down', 'reset', 'status'];
    const spies = operationList.map((name) => mockAsyncMethod(name));

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
    for (const spy of spies) {
      expect(spy).toHaveBeenCalled();
    }
  });

  it('should invoke yargs failure handlers', async () => {
    mockAsyncMethod('check');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await MigrationMongoCli.migrate({
      uri: 'mongodb://localhost/test',
      database: 'database',
      collection: 'migrations',
      path: temporaryDirectory,
    });
    const failCalls = yargsInstance.fail.mock.calls as unknown[][];
    const fail = failCalls[0][0] as (message: string, error?: Error) => void;
    fail('bad command');
    fail('bad command', new Error('failure'));

    expect(consoleError).toHaveBeenCalledTimes(2);
    expect((mockedYargs as jest.Mock & { showHelp: jest.Mock }).showHelp).toHaveBeenCalledTimes(2);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('should create, connect, and reuse a Mongo client', async () => {
    const first = await invoke<Promise<typeof client>>('getMongoClient');
    const second = await invoke<Promise<typeof client>>('getMongoClient');

    expect(first).toBe(client);
    expect(second).toBe(client);
    expect(mockedMongoClient).toHaveBeenCalledTimes(1);
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('should reject a Mongo connection timeout', async () => {
    client.connect.mockReturnValueOnce(new Promise(() => undefined));
    const promise = invoke<Promise<typeof client>>('getMongoClient');
    const rejection = expect(promise).rejects.toThrow('Connection timeout');

    await jest.advanceTimersByTimeAsync(5000);

    await rejection;
  });

  it('should check the configured database and report failures', async () => {
    await invoke<Promise<void>>('check');
    expect(db.collections).toHaveBeenCalled();

    assign({ client: undefined, clientIsConnected: false });
    client.connect.mockRejectedValueOnce(new Error('connection failure'));
    await invoke<Promise<void>>('check');
    expect(consoleLog).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('should drop empty and populated databases', async () => {
    assign({ client, clientIsConnected: true });
    await invoke<Promise<void>>('drop');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No collections to drop'));

    const first = { collectionName: 'first', drop: jest.fn().mockResolvedValue(undefined) };
    const second = { collectionName: 'second', drop: jest.fn().mockResolvedValue(undefined) };
    db.collections.mockResolvedValueOnce([first, second]);
    await invoke<Promise<void>>('drop');
    expect(first.drop).toHaveBeenCalled();
    expect(second.drop).toHaveBeenCalled();
  });

  it('should create migration files from custom and bundled templates', async () => {
    const customTemplate = path.join(temporaryDirectory, 'template.ts');
    fs.writeFileSync(
      customTemplate,
      'class MongoMigrationClass { mongoMigrationCollection mongoMigrationField mongo_migration_index }',
    );
    assign({
      configuration: {
        uri: 'uri',
        database: 'database',
        collection: 'migrations',
        path: temporaryDirectory,
        template: customTemplate,
      },
    });
    jest.spyOn(Date.prototype, 'getTime').mockReturnValue(123);

    await invoke<Promise<void>>('create', 'User Profile');
    const file = path.join(temporaryDirectory, '123_user-profile.js');
    expect(fs.readFileSync(file, 'utf8')).toContain('UserProfile_123');

    assign({
      configuration: {
        uri: 'uri',
        database: 'database',
        collection: 'migrations',
        path: temporaryDirectory,
      },
    });
    expect(invoke<string>('getTemplate', 1, 'sample-name')).toContain('SampleName_1');
  });

  it('should report template read failures', () => {
    assign({
      configuration: {
        path: temporaryDirectory,
        template: path.join(temporaryDirectory, 'missing.ts'),
      },
    });

    expect(invoke('getTemplate', 1, 'sample')).toBeUndefined();
    expect(consoleLog).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('should apply pending migrations and report when none exist', async () => {
    assign({ client, clientIsConnected: true });
    fs.writeFileSync(path.join(temporaryDirectory, '1_first.js'), 'module.exports = {}');
    fs.writeFileSync(path.join(temporaryDirectory, '2_second.js'), 'module.exports = {}');
    collection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValue([{ fileName: '1_first.ts' }]),
    });
    const execute = mockAsyncMethod('executeMigrationUp');

    await invoke<Promise<void>>('up');
    expect(execute).toHaveBeenCalledWith('2_second.js');

    collection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValue([{ fileName: '1_first' }, { fileName: '2_second' }]),
    });
    await invoke<Promise<void>>('up');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to up'));
  });

  it('should revoke the latest or all migrations', async () => {
    assign({ client, clientIsConnected: true });
    const log = { _id: 'id', fileName: '1_first' };
    const execute = mockAsyncMethod('executeMigrationDown');

    collection.findOne.mockResolvedValueOnce(log);
    await invoke<Promise<void>>('down');
    expect(execute).toHaveBeenCalledWith(log);

    collection.findOne.mockResolvedValueOnce(null);
    await invoke<Promise<void>>('down');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to down'));

    collection.find.mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue([log]) });
    await invoke<Promise<void>>('reset');
    collection.find.mockReturnValueOnce({ toArray: jest.fn().mockResolvedValue([]) });
    await invoke<Promise<void>>('reset');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migrations to reset'));
  });

  it('should display empty, applied, and pending migration status', async () => {
    assign({ client, clientIsConnected: true });
    await invoke<Promise<void>>('status');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('No migration files found.'));

    fs.writeFileSync(path.join(temporaryDirectory, '1_first.js'), '');
    fs.writeFileSync(path.join(temporaryDirectory, '2_second.js'), '');
    collection.find.mockReturnValueOnce({
      toArray: jest.fn().mockResolvedValue([{ fileName: '1_first.ts' }]),
    });
    await invoke<Promise<void>>('status');
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('APPLIED'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('PENDING'));
  });

  it('should load valid migration modules and report invalid modules', async () => {
    const moduleDirectory = path.join(temporaryDirectory, 'node_modules', 'migrations');
    fs.mkdirSync(moduleDirectory, { recursive: true });
    assign({
      configuration: {
        uri: 'uri',
        database: 'database',
        collection: 'migrations',
        path: moduleDirectory,
      },
    });
    const valid = path.join(moduleDirectory, 'valid.js');
    const invalid = path.join(moduleDirectory, 'invalid.js');
    fs.writeFileSync(
      valid,
      'module.exports.ValidMigration = class ValidMigration { async up() {} async down() {} };',
    );
    fs.writeFileSync(invalid, 'module.exports.value = true;');

    const migration = await invoke<Promise<MigrationMongoCliInterface>>('getMigration', 'valid.js');
    expect(migration.constructor.name).toBe('ValidMigration');

    await invoke<Promise<MigrationMongoCliInterface>>('getMigration', 'invalid.js');
    await invoke<Promise<MigrationMongoCliInterface>>('getMigration', 'missing.js');
    expect(consoleLog).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('should execute migrations in both directions and report failures', async () => {
    assign({ client, clientIsConnected: true });
    const migration = {
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
    };
    const getMigration = mockAsyncMethod('getMigration', migration);

    await invoke<Promise<void>>('executeMigrationUp', '1_first.js');
    expect(migration.up).toHaveBeenCalledWith(db);
    expect(collection.insertOne).toHaveBeenCalled();

    const log = { _id: 'id', fileName: '1_first.js' };
    await invoke<Promise<void>>('executeMigrationDown', log);
    expect(migration.down).toHaveBeenCalledWith(db);
    expect(collection.deleteOne).toHaveBeenCalledWith({ _id: 'id' });

    getMigration.mockResolvedValueOnce({
      up: jest.fn().mockRejectedValue(new Error('up failure')),
      down: jest.fn(),
    });
    await invoke<Promise<void>>('executeMigrationUp', '2_second.js');
    getMigration.mockResolvedValueOnce({
      up: jest.fn(),
      down: jest.fn().mockRejectedValue(new Error('down failure')),
    });
    await invoke<Promise<void>>('executeMigrationDown', log);
    expect(consoleLog).toHaveBeenCalled();
  });

  it('should select extensions, filters, and normalized file names', () => {
    const originalArgv = process.argv;
    const originalExecArgv = process.execArgv;
    const symbol = Symbol.for('ts-node.register.instance');

    try {
      process.argv = ['node', 'script'];
      process.execArgv = [];
      delete (process as NodeJS.Process & { [key: symbol]: unknown })[symbol];
      expect(invoke('getMigrationExtension')).toBe('.js');
      expect(String(invoke<RegExp[]>('getMigrationFileFilter')[0])).toContain('js');
      expect(invoke('getMigrationFileName', '1_first.ts')).toBe('1_first.js');

      process.argv = ['node', 'ts-node'];
      expect(invoke('getMigrationExtension')).toBe('.ts');
      expect(String(invoke<RegExp[]>('getMigrationFileFilter')[0])).toContain('ts');

      process.argv = ['node'];
      process.execArgv = ['ts-node/register'];
      expect(invoke('isTypeScriptExecution')).toBe(true);

      process.execArgv = [];
      (process as NodeJS.Process & { [key: symbol]: unknown })[symbol] = {};
      expect(invoke('isTypeScriptExecution')).toBe(true);
      expect(invoke('normalizeMigrationFileName', '1_first.ts')).toBe('1_first');
    } finally {
      process.argv = originalArgv;
      process.execArgv = originalExecArgv;
      delete (process as NodeJS.Process & { [key: symbol]: unknown })[symbol];
    }
  });
});
