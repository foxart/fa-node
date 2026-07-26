import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import { createConnection } from 'mysql2/promise';
import type { Connection, RowDataPacket } from 'mysql2/promise';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CodegenHelper } from '../helpers/codegen.helper';
import { ConverterHelper } from '../helpers/converter.helper';

const loadModule = createRequire(__filename);

export interface MigrationMysqlCliInterface {
  down(connection: Connection): Promise<void>;
  up(connection: Connection): Promise<void>;
}

interface MigrationLockRow extends RowDataPacket {
  acquired: number;
}

interface SchemaMigrationRow extends RowDataPacket {
  appliedAt: Date;
  fileName: string;
  id: number;
}

interface DatabaseTableRow extends RowDataPacket {
  tableName: string;
}

interface ConfigurationInterface {
  uri: string;
  database: string;
  table: string;
  path: string;
  template?: string;
}

type MigrationStatus = {
  fileName: string;
  status: 'APPLIED' | 'PENDING';
};

enum CommandNameEnum {
  DROP = 'drop',
  CREATE = 'create <migration>',
  UP = 'up',
  DOWN = 'down',
  RESET = 'reset',
  STATUS = 'status',
}

type CommandBuilderYargs = {
  positional: (key: string, options: yargs.Options) => void;
};

interface CommandInterface {
  name: CommandNameEnum;
  desc: string;
  builder?: (yargs: CommandBuilderYargs) => void;
  handler: (argv: yargs.ArgumentsCamelCase<Record<string, unknown>>) => void;
}

class MigrationMysqlCliClass {
  private configuration!: ConfigurationInterface;

  private readonly commandList: CommandInterface[] = this.getCommandList();

  public async migrate(configuration: ConfigurationInterface): Promise<void> {
    this.configuration = configuration;
    await this.check();
    const yargsInstance = this.commandList.reduce(
      (instance, command) =>
        instance.command(
          command.name,
          command.desc,
          (builder) => {
            command.builder?.(builder);
            return builder;
          },
          command.handler,
        ),
      yargs(hideBin(process.argv)),
    );
    void yargsInstance
      .demandCommand(1, 'Use --help to view available commands.')
      .strictCommands(true)
      .fail((message, error) => {
        if (error) {
          console.error('Error:', error.message);
        } else {
          console.error('Invalid command:', message);
        }
        yargs.showHelp();
        process.exit(1);
      })
      .help().argv;
  }

  private getCommandList(): CommandInterface[] {
    const emptyBuilder = (): void => {
      return;
    };
    return [
      {
        name: CommandNameEnum.DROP,
        desc: 'Drops all tables in the database',
        builder: emptyBuilder,
        handler: (): void => void this.executeDrop(),
      },
      {
        name: CommandNameEnum.CREATE,
        desc: 'Creates migration',
        builder: (instance: CommandBuilderYargs): void => {
          instance.positional('migration', {
            describe: 'The migration name',
            type: 'string',
          });
        },
        handler: (argv): void => {
          if (typeof argv.migration !== 'string') {
            throw new Error('Migration argument is required');
          }
          void this.executeCreate(argv.migration);
        },
      },
      {
        name: CommandNameEnum.UP,
        desc: 'Applies migration',
        builder: emptyBuilder,
        handler: (): void => void this.executeUp(),
      },
      {
        name: CommandNameEnum.DOWN,
        desc: 'Revokes migration',
        builder: emptyBuilder,
        handler: (): void => void this.executeDown(),
      },
      {
        name: CommandNameEnum.RESET,
        desc: 'Revokes all migrations',
        builder: emptyBuilder,
        handler: (): void => void this.executeReset(),
      },
      {
        name: CommandNameEnum.STATUS,
        desc: 'Lists all migrations',
        builder: emptyBuilder,
        handler: (): void => void this.executeStatus(),
      },
    ];
  }

  private async check(): Promise<void> {
    let connection: Connection | undefined;
    try {
      connection = await createConnection({
        database: this.configuration.database,
        connectTimeout: 5000,
        uri: this.configuration.uri,
      });
      await connection.query('SELECT 1');
    } catch (error) {
      CodegenHelper.logError(this.check.name, error);
      process.exit(1);
    } finally {
      await connection?.end();
    }
  }

  private async executeDrop(): Promise<void> {
    CodegenHelper.displayMessage('migration', CommandNameEnum.DROP);
    await this.execute(CommandNameEnum.DROP, async () => {
      const tableList = await this.drop(this.configuration);
      if (!tableList.length) {
        CodegenHelper.logSuccess(this.configuration.database, 'No tables to drop');
        return;
      }
      for (const table of tableList) {
        CodegenHelper.logSuccess(this.configuration.database, `Dropped table: ${table}`);
      }
      CodegenHelper.logSuccess(this.configuration.database, 'All tables dropped');
    });
  }

  private async executeCreate(migration: string): Promise<void> {
    CodegenHelper.displayMessage('migration', 'create');
    await this.execute(CommandNameEnum.CREATE, async () => {
      const file = await this.create(this.configuration, migration);
      CodegenHelper.logSuccess(this.normalizeMigrationFileName(basename(file)), basename(file));
    });
  }

  private async executeUp(): Promise<void> {
    CodegenHelper.displayMessage('migration', CommandNameEnum.UP);
    await this.execute(CommandNameEnum.UP, async () => {
      const fileList = await this.up(this.configuration);
      if (!fileList.length) {
        CodegenHelper.logSuccess(this.configuration.table, 'No migrations to up');
        return;
      }
      for (const file of fileList) {
        CodegenHelper.logSuccess(this.getMigration(this.configuration.path, file).constructor.name, file);
      }
    });
  }

  private async executeDown(): Promise<void> {
    CodegenHelper.displayMessage('migration', CommandNameEnum.DOWN);
    await this.execute(CommandNameEnum.DOWN, async () => {
      const fileList = await this.down(this.configuration);
      if (!fileList.length) {
        CodegenHelper.logSuccess(this.configuration.table, 'No migrations to down');
        return;
      }
      for (const file of fileList) {
        CodegenHelper.logSuccess(this.getMigration(this.configuration.path, file).constructor.name, file);
      }
    });
  }

  private async executeReset(): Promise<void> {
    CodegenHelper.displayMessage('migration', CommandNameEnum.RESET);
    await this.execute(CommandNameEnum.RESET, async () => {
      const fileList = await this.reset(this.configuration);
      if (!fileList.length) {
        CodegenHelper.logSuccess(this.configuration.table, 'No migrations to reset');
        return;
      }
      for (const file of fileList) {
        CodegenHelper.logSuccess(this.getMigration(this.configuration.path, file).constructor.name, file);
      }
    });
  }

  private async executeStatus(): Promise<void> {
    CodegenHelper.displayMessage('migration', CommandNameEnum.STATUS);
    await this.execute(CommandNameEnum.STATUS, async () => {
      const statusList = await this.status(this.configuration);
      if (!statusList.length) {
        CodegenHelper.logSuccess(this.configuration.table, 'No migration files found.');
        return;
      }
      for (const { fileName, status } of statusList) {
        if (status === 'APPLIED') {
          CodegenHelper.logSuccess(fileName, status);
        } else {
          CodegenHelper.logWarning(fileName, status);
        }
      }
    });
  }

  private async execute(command: CommandNameEnum, callback: () => Promise<void>): Promise<void> {
    try {
      await callback();
    } catch (error) {
      CodegenHelper.logError(command, error);
      process.exitCode = 1;
    }
  }

  public async create(configuration: ConfigurationInterface, migration: string): Promise<string> {
    const timestamp = Date.now();
    const migrationName = ConverterHelper.tokenizeWords(migration.replace(/[^a-zA-Z0-9]/g, '-'), '-').toLowerCase();
    if (!migrationName) {
      throw new Error('Migration name is required');
    }
    const fileName = `${timestamp}_${migrationName}`;
    const filePath = join(configuration.path, `${fileName}.ts`);
    const templatePath = configuration.template ?? join(__dirname, 'migration-mysql.template.ts');
    const template = await readFile(templatePath, 'utf8');
    const className = `${ConverterHelper.toPascalCase(migrationName, '-')}_${timestamp}`;
    const tableName = `${migrationName.replace(/-/g, '_')}_${timestamp}`;
    const renamedTableName = `${tableName}_renamed`;
    const columnName = `${ConverterHelper.toCamelCase(migrationName, '-')}_${timestamp}`;
    const renamedColumnName = `${columnName}_renamed`;
    const indexName = `${migrationName.replace(/-/g, '_')}_idx_${timestamp}`;
    const foreignTableName = `${tableName}_foreign`;
    const foreignColumnName = `${columnName}_id`;
    const source = template
      .replace(/MysqlMigrationClass/g, className)
      .replace(/mysqlMigrationRenamedTable/g, renamedTableName)
      .replace(/mysqlMigrationTable/g, tableName)
      .replace(/mysqlMigrationRenamedColumn/g, renamedColumnName)
      .replace(/mysqlMigrationColumn/g, columnName)
      .replace(/mysqlMigrationForeignTable/g, foreignTableName)
      .replace(/mysqlMigrationForeignColumn/g, foreignColumnName)
      .replace(/mysql_migration_index/g, indexName);

    await writeFile(filePath, source, { flag: 'wx' });
    return filePath;
  }

  public up(configuration: ConfigurationInterface): Promise<string[]> {
    return this.withConnection(configuration, async (connection, migrationTable) => {
      const fileList = await this.getMigrationFileList(configuration.path);
      const applied = await this.getAppliedMigrations(connection, migrationTable);
      const executed: string[] = [];

      for (const fileName of fileList) {
        const normalizedFileName = this.normalizeMigrationFileName(fileName);
        if (applied.has(normalizedFileName)) {
          continue;
        }

        const migration = this.getMigration(configuration.path, fileName);
        await migration.up(connection);
        await connection.execute(`INSERT INTO ${migrationTable} (filename) VALUES (?)`, [normalizedFileName]);
        executed.push(fileName);
      }
      return executed;
    });
  }

  public down(configuration: ConfigurationInterface): Promise<string[]> {
    return this.withConnection(configuration, async (connection, migrationTable) => {
      const migrationList = await this.getAppliedMigrationList(connection, migrationTable);
      const migration = migrationList[0];
      if (!migration) {
        return [];
      }
      const fileName = await this.rollbackMigration(connection, migrationTable, configuration.path, migration);
      return [fileName];
    });
  }

  public reset(configuration: ConfigurationInterface): Promise<string[]> {
    return this.withConnection(configuration, async (connection, migrationTable) => {
      const migrationList = await this.getAppliedMigrationList(connection, migrationTable);
      const executed: string[] = [];
      for (const migration of migrationList) {
        executed.push(await this.rollbackMigration(connection, migrationTable, configuration.path, migration));
      }
      return executed;
    });
  }

  public status(configuration: ConfigurationInterface): Promise<MigrationStatus[]> {
    return this.withConnection(configuration, async (connection, migrationTable) => {
      const fileList = await this.getMigrationFileList(configuration.path);
      const applied = await this.getAppliedMigrations(connection, migrationTable);
      return fileList.map((fileName) => ({
        fileName,
        status: applied.has(this.normalizeMigrationFileName(fileName)) ? 'APPLIED' : 'PENDING',
      }));
    });
  }

  public drop(configuration: ConfigurationInterface): Promise<string[]> {
    return this.withConnection(configuration, async (connection) => {
      const [rows] = await connection.execute<DatabaseTableRow[]>(
        `SELECT TABLE_NAME AS tableName
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME`,
        [configuration.database],
      );
      if (!rows.length) {
        return [];
      }

      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      try {
        for (const { tableName } of rows) {
          await connection.query(`DROP TABLE IF EXISTS ${this.quoteIdentifier(tableName)}`);
        }
      } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      }
      return rows.map(({ tableName }) => tableName);
    });
  }

  private async withConnection<T>(
    configuration: ConfigurationInterface,
    callback: (connection: Connection, migrationTable: string) => Promise<T>,
  ): Promise<T> {
    const migrationTable = this.quoteIdentifier(configuration.table);
    const connection = await createConnection({
      database: configuration.database,
      multipleStatements: true,
      timezone: 'Z',
      uri: configuration.uri,
    });
    const lockName = `${configuration.database}:${configuration.table}`;

    try {
      await this.acquireLock(connection, lockName);
      await this.createMigrationTable(connection, migrationTable, configuration.table);
      return await callback(connection, migrationTable);
    } finally {
      await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => undefined);
      await connection.end();
    }
  }

  private quoteIdentifier(identifier: string): string {
    if (!/^[a-z0-9_]+$/i.test(identifier)) {
      throw new Error(`Invalid MySQL identifier: ${identifier}`);
    }
    return `\`${identifier}\``;
  }

  private async acquireLock(connection: Connection, lockName: string): Promise<void> {
    const [lockRows] = await connection.execute<MigrationLockRow[]>('SELECT GET_LOCK(?, 30) AS acquired', [lockName]);
    if (lockRows[0]?.acquired !== 1) {
      throw new Error(`Timed out waiting for migration lock ${lockName}`);
    }
  }

  private async createMigrationTable(connection: Connection, migrationTable: string, tableName: string): Promise<void> {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ${migrationTable} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        filename VARCHAR(255) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY ${this.quoteIdentifier(`${tableName}_filename_unique`)} (filename)
      ) ENGINE=InnoDB
    `);
  }

  private async getAppliedMigrations(connection: Connection, migrationTable: string): Promise<Set<string>> {
    const migrationList = await this.getAppliedMigrationList(connection, migrationTable, false);
    return new Set(migrationList.map((migration) => this.normalizeMigrationFileName(migration.fileName)));
  }

  private async getAppliedMigrationList(
    connection: Connection,
    migrationTable: string,
    descending = true,
  ): Promise<SchemaMigrationRow[]> {
    const [rows] = await connection.query<SchemaMigrationRow[]>(
      `SELECT id, applied_at AS appliedAt, filename AS fileName
       FROM ${migrationTable}
       ORDER BY id ${descending ? 'DESC' : 'ASC'}`,
    );
    return rows;
  }

  private async rollbackMigration(
    connection: Connection,
    migrationTable: string,
    migrationPath: string,
    migration: SchemaMigrationRow,
  ): Promise<string> {
    const fileName = this.getMigrationFileName(migration.fileName);
    const migrationInstance = this.getMigration(migrationPath, fileName);
    await migrationInstance.down(connection);
    await connection.execute(`DELETE FROM ${migrationTable} WHERE id = ?`, [migration.id]);
    return fileName;
  }

  private async getMigrationFileList(path: string): Promise<string[]> {
    return (await readdir(path))
      .filter((fileName) => /^\d+_[a-z0-9_-]+\.(ts|js)$/i.test(fileName))
      .sort((left, right) => left.localeCompare(right));
  }

  private getMigration(path: string, fileName: string): MigrationMysqlCliInterface {
    const module = loadModule(join(path, this.getMigrationFileName(fileName))) as Record<string, unknown>;
    const exports = Object.values(module).flatMap((value): unknown[] =>
      typeof value === 'object' && value !== null ? Object.values(value as Record<string, unknown>) : [value],
    );
    const ClassToLoad = exports.find(
      (value): value is new () => MigrationMysqlCliInterface =>
        typeof value === 'function' &&
        typeof (value as { prototype?: Partial<MigrationMysqlCliInterface> }).prototype?.up === 'function' &&
        typeof (value as { prototype?: Partial<MigrationMysqlCliInterface> }).prototype?.down === 'function',
    );
    if (!ClassToLoad) {
      throw new Error(`No valid constructor in: ${fileName}`);
    }
    return new ClassToLoad();
  }

  private normalizeMigrationFileName(fileName: string): string {
    return fileName.replace(/\.(ts|js)$/i, '');
  }

  private getMigrationFileName(fileName: string): string {
    return `${this.normalizeMigrationFileName(fileName)}${this.getMigrationExtension()}`;
  }

  private getMigrationExtension(): '.ts' | '.js' {
    return this.isTypeScriptExecution() ? '.ts' : '.js';
  }

  private isTypeScriptExecution(): boolean {
    return (
      process.argv.some((argument) => argument.includes('ts-node')) ||
      process.execArgv.some((argument) => argument.includes('ts-node')) ||
      Boolean((process as NodeJS.Process & { [key: symbol]: unknown })[Symbol.for('ts-node.register.instance')])
    );
  }
}

export const MigrationMysqlCli: MigrationMysqlCliClass = new MigrationMysqlCliClass();
