import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConnection } from 'mysql2/promise';
import yargs from 'yargs';
import { MigrationMysqlCli } from './migration-mysql.cli';

jest.mock('mysql2/promise', () => ({
  createConnection: jest.fn(),
}));

jest.mock('yargs', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('yargs/helpers', () => ({
  hideBin: jest.fn((value: string[]) => value.slice(2)),
}));

function invoke<R>(method: string, ...args: unknown[]): R {
  const callback = (MigrationMysqlCli as unknown as Record<string, (...parameters: unknown[]) => unknown>)[method];
  return callback.apply(MigrationMysqlCli, args) as R;
}

function writeMigration(directory: string, fileName: string, upSql: string, downSql: string): string {
  const source = `exports.Migration = class {
    async up(connection) { await connection.query(${JSON.stringify(upSql)}); }
    async down(connection) { await connection.query(${JSON.stringify(downSql)}); }
  };`;
  writeFileSync(join(directory, `${fileName}.js`), source);
  return source;
}

describe('MigrationMysqlCli', () => {
  const mockedCreateConnection = createConnection as jest.Mock;
  const mockedYargs = yargs as unknown as jest.Mock;
  const configuration = {
    database: 'dashboard',
    path: '',
    table: 'app_migrations',
    uri: 'mysql://user:password@localhost:3306/dashboard',
  };
  let temporaryDirectory: string;
  let query: jest.Mock;
  let execute: jest.Mock;
  let end: jest.Mock;
  let yargsInstance: {
    argv: unknown;
    command: jest.Mock;
    demandCommand: jest.Mock;
    fail: jest.Mock;
    help: jest.Mock;
    showHelp: jest.Mock;
    strictCommands: jest.Mock;
  };

  beforeEach(() => {
    mockedCreateConnection.mockReset();
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'mysql-migration-'));
    configuration.path = temporaryDirectory;
    query = jest.fn().mockResolvedValue([[]]);
    execute = jest.fn((sql: string) => {
      if (sql.includes('GET_LOCK')) {
        return Promise.resolve([[{ acquired: 1 }]]);
      }
      return Promise.resolve([[]]);
    });
    end = jest.fn().mockResolvedValue(undefined);
    mockedCreateConnection.mockResolvedValue({ query, execute, end });
    yargsInstance = {
      argv: {},
      command: jest.fn(),
      demandCommand: jest.fn(),
      fail: jest.fn(),
      help: jest.fn(),
      showHelp: jest.fn(),
      strictCommands: jest.fn(),
    };
    yargsInstance.command.mockReturnValue(yargsInstance);
    yargsInstance.demandCommand.mockReturnValue(yargsInstance);
    yargsInstance.fail.mockReturnValue(yargsInstance);
    yargsInstance.help.mockReturnValue(yargsInstance);
    yargsInstance.strictCommands.mockReturnValue(yargsInstance);
    mockedYargs.mockReturnValue(yargsInstance);
    (mockedYargs as jest.Mock & { showHelp: jest.Mock }).showHelp = jest.fn();
  });

  afterEach(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    jest.restoreAllMocks();
    mockedYargs.mockReset();
  });

  it('should register the same six commands as the Mongo CLI', async () => {
    await MigrationMysqlCli.migrate(configuration);

    expect(yargsInstance.command).toHaveBeenCalledTimes(6);
    expect(yargsInstance.demandCommand).toHaveBeenCalled();
    expect(yargsInstance.strictCommands).toHaveBeenCalledWith(true);
    expect(yargsInstance.help).toHaveBeenCalled();
  });

  it('should log command and migration results through CodegenHelper', async () => {
    writeMigration(temporaryDirectory, '001_first', 'SELECT 1;', 'SELECT -1;');
    Object.assign(MigrationMysqlCli as unknown as Record<string, unknown>, {
      configuration,
    });
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await invoke<Promise<void>>('executeUp');

    const output = consoleLog.mock.calls.flat().join('\n');
    expect(output).toContain('MIGRATION');
    expect(output).toContain('up');
    expect(output).toContain('001_first.js');
    expect(output).not.toContain('MySQL migrations up:');
  });

  it('should apply pending TypeScript migrations in file-name order', async () => {
    writeMigration(temporaryDirectory, '001_first', 'CREATE TABLE first_table (id INT);', 'DROP TABLE first_table;');
    writeMigration(temporaryDirectory, '002_second', 'CREATE TABLE second_table (id INT);', 'DROP TABLE second_table;');
    writeFileSync(join(temporaryDirectory, 'README.md'), 'ignored');
    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id')) {
        return Promise.resolve([
          [
            {
              appliedAt: new Date('2026-07-26T00:00:00.000Z'),
              fileName: '001_first',
              id: 1,
            },
          ],
        ]);
      }
      return Promise.resolve([[]]);
    });

    await expect(MigrationMysqlCli.up(configuration)).resolves.toEqual(['002_second.js']);

    expect(mockedCreateConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        database: 'dashboard',
        multipleStatements: true,
        timezone: 'Z',
      }),
    );
    const createTableQuery = query.mock.calls
      .map(([sql]) => sql as string)
      .find((sql) => sql.includes('CREATE TABLE IF NOT EXISTS `app_migrations`'));
    expect(createTableQuery).toContain('id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
    expect(createTableQuery).toContain('applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)');
    expect(createTableQuery).toContain('filename VARCHAR(255) NOT NULL');
    expect(createTableQuery).not.toContain('version');
    expect(createTableQuery).not.toContain('checksum');
    expect(query).toHaveBeenCalledWith('CREATE TABLE second_table (id INT);');
    expect(execute).toHaveBeenCalledWith('INSERT INTO `app_migrations` (filename) VALUES (?)', ['002_second']);
    expect(execute).toHaveBeenLastCalledWith('SELECT RELEASE_LOCK(?)', ['dashboard:app_migrations']);
    expect(end).toHaveBeenCalled();
  });

  it('should create a TypeScript migration with up and down methods from the bundled template', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(123);

    await expect(MigrationMysqlCli.create(configuration, 'User Profile')).resolves.toBe(
      join(temporaryDirectory, '123_user-profile.ts'),
    );

    const source = readFileSync(join(temporaryDirectory, '123_user-profile.ts'), 'utf8');
    expect(source).toContain('export class UserProfile_123CreateTable');
    expect(source).toContain('public async up(connection: Connection)');
    expect(source).toContain('public async down(connection: Connection)');
    expect(mockedCreateConnection).not.toHaveBeenCalled();
  });

  it('should roll back the latest applied migration', async () => {
    const downSql = 'DROP TABLE users;';
    writeMigration(temporaryDirectory, '001_users', 'CREATE TABLE users (id INT);', downSql);
    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id')) {
        return Promise.resolve([
          [
            {
              appliedAt: new Date('2026-07-26T00:00:00.000Z'),
              fileName: '001_users',
              id: 7,
            },
          ],
        ]);
      }
      return Promise.resolve([[]]);
    });

    await expect(MigrationMysqlCli.down(configuration)).resolves.toEqual(['001_users.js']);

    expect(query).toHaveBeenCalledWith(downSql);
    expect(execute).toHaveBeenCalledWith('DELETE FROM `app_migrations` WHERE id = ?', [7]);
  });

  it('should reset applied migrations in reverse order', async () => {
    writeMigration(temporaryDirectory, '001_first', 'SELECT 1;', 'SELECT -1;');
    writeMigration(temporaryDirectory, '002_second', 'SELECT 2;', 'SELECT -2;');
    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id')) {
        return Promise.resolve([
          [
            {
              appliedAt: new Date('2026-07-26T00:00:01.000Z'),
              fileName: '002_second',
              id: 2,
            },
            {
              appliedAt: new Date('2026-07-26T00:00:00.000Z'),
              fileName: '001_first',
              id: 1,
            },
          ],
        ]);
      }
      return Promise.resolve([[]]);
    });

    await expect(MigrationMysqlCli.reset(configuration)).resolves.toEqual(['002_second.js', '001_first.js']);

    const rollbackQueries = query.mock.calls.map(([sql]) => sql as string).filter((sql) => /^SELECT -/.test(sql));
    expect(rollbackQueries).toEqual(['SELECT -2;', 'SELECT -1;']);
  });

  it('should report applied and pending migration status', async () => {
    writeMigration(temporaryDirectory, '001_first', 'SELECT 1;', 'SELECT -1;');
    writeMigration(temporaryDirectory, '002_second', 'SELECT 2;', 'SELECT -2;');
    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id')) {
        return Promise.resolve([
          [
            {
              appliedAt: new Date('2026-07-26T00:00:00.000Z'),
              fileName: '001_first',
              id: 1,
            },
          ],
        ]);
      }
      return Promise.resolve([[]]);
    });

    await expect(MigrationMysqlCli.status(configuration)).resolves.toEqual([
      { fileName: '001_first.js', status: 'APPLIED' },
      { fileName: '002_second.js', status: 'PENDING' },
    ]);
  });

  it('should drop all database tables with foreign-key checks disabled', async () => {
    execute.mockImplementation((sql: string) => {
      if (sql.includes('GET_LOCK')) {
        return Promise.resolve([[{ acquired: 1 }]]);
      }
      if (sql.includes('information_schema.TABLES')) {
        return Promise.resolve([[{ tableName: 'auth_sessions' }, { tableName: 'users' }]]);
      }
      return Promise.resolve([[]]);
    });

    await expect(MigrationMysqlCli.drop(configuration)).resolves.toEqual(['auth_sessions', 'users']);

    expect(query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 0');
    expect(query).toHaveBeenCalledWith('DROP TABLE IF EXISTS `auth_sessions`');
    expect(query).toHaveBeenCalledWith('DROP TABLE IF EXISTS `users`');
    expect(query).toHaveBeenCalledWith('SET FOREIGN_KEY_CHECKS = 1');
  });

  it('should reject a migration class without up and down methods', async () => {
    const source = 'module.exports = class {};';
    writeFileSync(join(temporaryDirectory, '001_invalid.js'), source);
    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT id')) {
        return Promise.resolve([
          [
            {
              appliedAt: new Date('2026-07-26T00:00:00.000Z'),
              fileName: '001_invalid',
              id: 1,
            },
          ],
        ]);
      }
      return Promise.resolve([[]]);
    });

    await expect(MigrationMysqlCli.down(configuration)).rejects.toThrow('No valid constructor in: 001_invalid.js');
  });

  it('should validate migration names and identifiers', async () => {
    await expect(MigrationMysqlCli.create(configuration, '---')).rejects.toThrow('Migration name is required');
    await expect(
      MigrationMysqlCli.up({
        ...configuration,
        table: 'app-migrations',
      }),
    ).rejects.toThrow('Invalid MySQL identifier: app-migrations');
    expect(mockedCreateConnection).not.toHaveBeenCalled();
  });
});
