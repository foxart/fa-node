import type { Connection, RowDataPacket } from 'mysql2/promise';
import { createConnection } from 'mysql2/promise';
import { createRequire } from 'node:module';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CodegenHelper } from '../helpers/codegen.helper';
import { ConverterHelper } from '../helpers/converter.helper';
import { DataHelper } from '../helpers/data.helper';
import { IoHelper } from '../helpers/io.helper';

const loadModule = createRequire(__filename);

export interface MigrationMysqlCliInterface {
  up(connection: Connection): Promise<void>;
  down(connection: Connection): Promise<void>;
}

interface ConfigurationInterface {
  pathMigration: string;
  uri: string;
  database: string;
  table: string;
  template?: string;
}

enum CommandNameEnum {
  DROP = 'drop',
  CREATE = 'create <migration>',
  UP = 'up',
  DOWN = 'down',
  RESET = 'reset',
  STATUS = 'status',
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
  private static readonly migrationFileExtensionRegexp = /\.(ts|js)$/;

  private connection!: Connection;

  private configuration!: ConfigurationInterface;

  private readonly commandList: CommandInterface[];

  public constructor() {
    this.commandList = this.getCommandList();
  }

  public async migrate(configuration: ConfigurationInterface): Promise<void> {
    this.configuration = configuration;
    await this.check();
    const yargsInstance = this.commandList.reduce(
      (yargsInstance, command) =>
        yargsInstance.command(
          command.name,
          command.desc,
          (instance) => {
            command.builder?.(instance);
            return instance;
          },
          command.handler,
        ),
      yargs(hideBin(process.argv)),
    );
    void yargsInstance
      .demandCommand(1, 'Use --help to view available commands.')
      .strictCommands(true)
      .fail((msg, err) => {
        if (err) {
          console.error('Error:', err.message);
        } else {
          console.error('Invalid command:', msg);
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
        handler: (): void => void this.drop(),
      },
      {
        name: CommandNameEnum.CREATE,
        desc: 'Creates migration',
        builder: (yargs: CommandBuilderYargs): void => {
          yargs.positional('migration', {
            describe: 'The migration name',
            type: 'string',
          });
        },
        handler: (argv): void => {
          if (typeof argv.migration !== 'string') {
            throw new Error('Migration argument is required');
          }
          void this.create(argv.migration);
        },
      },
      {
        name: CommandNameEnum.UP,
        desc: 'Applies migration',
        builder: emptyBuilder,
        handler: (): void => void this.up(),
      },
      {
        name: CommandNameEnum.DOWN,
        desc: 'Revokes migration',
        builder: emptyBuilder,
        handler: (): void => void this.down(),
      },
      {
        name: CommandNameEnum.RESET,
        desc: 'Revokes migration',
        builder: emptyBuilder,
        handler: (): void => void this.reset(),
      },
      {
        name: CommandNameEnum.STATUS,
        desc: 'Lists all migrations',
        builder: emptyBuilder,
        handler: (): void => void this.status(),
      },
    ];
  }

  private async getMysqlConnection(): Promise<Connection> {
    if (!this.connection) {
      this.connection = await createConnection({
        database: this.configuration.database,
        connectTimeout: 5000,
        multipleStatements: true,
        timezone: 'Z',
        uri: this.configuration.uri,
      });
    }
    return this.connection;
  }

  private async check(): Promise<void> {
    try {
      const connection = await this.getMysqlConnection();
      await connection.query('SELECT 1');
    } catch (e) {
      CodegenHelper.logError(this.check.name, e);
      process.exit(1);
    }
  }

  private async drop(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.drop.name);
    this.quoteIdentifier(this.configuration.table);
    const connection = await this.getMysqlConnection();
    const lockName = await this.acquireLock(connection);
    const [tableList] = await connection.execute<DatabaseTableRow[]>(
      `SELECT TABLE_NAME AS tableName
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [this.configuration.database],
    );
    if (tableList.length === 0) {
      await this.releaseLock(connection, lockName);
      CodegenHelper.logSuccess(this.configuration.database, 'No tables to drop');
      process.exit(0);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const { tableName } of tableList) {
        await connection.query(`DROP TABLE IF EXISTS ${this.quoteIdentifier(tableName)}`);
        CodegenHelper.logSuccess(this.configuration.database, `Dropped table: ${tableName}`);
      }
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    await this.releaseLock(connection, lockName);
    CodegenHelper.logSuccess(this.configuration.database, 'All tables dropped');
    process.exit(0);
  }

  private create(migration: string): Promise<void> {
    CodegenHelper.displayMessage('migration', this.create.name);
    const timestamp = new Date().getTime();
    const migrationName = ConverterHelper.tokenizeWords(migration.replace(/[^a-zA-Z0-9]/g, '-'), '-').toLowerCase();
    const fileName = `${timestamp}_${migrationName}`;
    const filePath = `${this.configuration.pathMigration}/${fileName}${this.getMigrationExtension()}`;
    IoHelper.createFileSync(filePath, this.getTemplate(timestamp, migrationName));
    CodegenHelper.logSuccess(`${fileName}`, DataHelper.excludePath(filePath, this.configuration.pathMigration));
    process.exit(0);
  }

  private async up(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.up.name);
    const migrationTable = this.quoteIdentifier(this.configuration.table);
    const connection = await this.getMysqlConnection();
    const lockName = await this.acquireLock(connection);
    await this.createMigrationTable(connection, migrationTable);
    const migrationList = await this.getAppliedMigrationList(connection, migrationTable, false);
    const migrationSet = new Set(migrationList.map((migration) => this.normalizeMigrationFileName(migration.fileName)));
    const fileList = this.scanMigrationFiles().filter(
      (file) => !migrationSet.has(this.normalizeMigrationFileName(file)),
    );
    if (fileList.length) {
      for (const file of fileList) {
        await this.executeMigrationUp(connection, migrationTable, file);
      }
    } else {
      CodegenHelper.logSuccess(this.configuration.table, `No migrations to ${this.up.name}`);
    }
    await this.releaseLock(connection, lockName);
    process.exit(0);
  }

  private async down(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.down.name);
    const migrationTable = this.quoteIdentifier(this.configuration.table);
    const connection = await this.getMysqlConnection();
    const lockName = await this.acquireLock(connection);
    await this.createMigrationTable(connection, migrationTable);
    const migrationList = await this.getAppliedMigrationList(connection, migrationTable);
    const migration = migrationList[0];
    if (migration) {
      await this.executeMigrationDown(connection, migrationTable, migration);
    } else {
      CodegenHelper.logSuccess(this.configuration.table, `No migrations to ${this.down.name}`);
    }
    await this.releaseLock(connection, lockName);
    process.exit(0);
  }

  private async reset(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.reset.name);
    const migrationTable = this.quoteIdentifier(this.configuration.table);
    const connection = await this.getMysqlConnection();
    const lockName = await this.acquireLock(connection);
    await this.createMigrationTable(connection, migrationTable);
    const migrationList = await this.getAppliedMigrationList(connection, migrationTable);
    if (migrationList.length) {
      for (const migration of migrationList) {
        await this.executeMigrationDown(connection, migrationTable, migration);
      }
    } else {
      CodegenHelper.logSuccess(this.configuration.table, `No migrations to ${this.reset.name}`);
    }
    await this.releaseLock(connection, lockName);
    process.exit(0);
  }

  private async status(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.status.name);
    const migrationTable = this.quoteIdentifier(this.configuration.table);
    const connection = await this.getMysqlConnection();
    const lockName = await this.acquireLock(connection);
    await this.createMigrationTable(connection, migrationTable);
    const migrationList = await this.getAppliedMigrationList(connection, migrationTable, false);
    const migrationsSet = new Set(
      migrationList.map((migration) => this.normalizeMigrationFileName(migration.fileName)),
    );
    const fileList = this.scanMigrationFiles();
    if (!fileList.length) {
      await this.releaseLock(connection, lockName);
      CodegenHelper.logSuccess(this.configuration.table, 'No migration files found.');
      process.exit(0);
    }
    for (const file of fileList) {
      const isApplied = migrationsSet.has(this.normalizeMigrationFileName(file));
      if (isApplied) {
        CodegenHelper.logSuccess(file, 'APPLIED');
      } else {
        CodegenHelper.logWarning(file, 'PENDING');
      }
    }
    await this.releaseLock(connection, lockName);
    process.exit(0);
  }

  private getTemplate(timestamp: number, migrationName: string): string {
    const pascalCase = ConverterHelper.toPascalCase(migrationName, '-');
    const camelCase = ConverterHelper.toCamelCase(migrationName, '-');
    const className = `${pascalCase}_${timestamp}`;
    const tableName = `${migrationName.replace(/-/g, '_')}_${timestamp}`;
    const renamedTableName = `${tableName}_renamed`;
    const columnName = `${camelCase}_${timestamp}`;
    const renamedColumnName = `${columnName}_renamed`;
    const indexName = `${migrationName.replace(/-/g, '_')}_idx_${timestamp}`;
    const foreignTableName = `${tableName}_foreign`;
    const foreignColumnName = `${columnName}_id`;
    try {
      const template = this.configuration.template
        ? IoHelper.readFileSync(this.configuration.template).toString()
        : IoHelper.readFileSync(`${__dirname}/migration-mysql.template.ts`).toString();
      return template
        .replace(/MysqlMigrationClass/g, className)
        .replace(/mysqlMigrationRenamedTable/g, renamedTableName)
        .replace(/mysqlMigrationTable/g, tableName)
        .replace(/mysqlMigrationRenamedColumn/g, renamedColumnName)
        .replace(/mysqlMigrationColumn/g, columnName)
        .replace(/mysqlMigrationForeignTable/g, foreignTableName)
        .replace(/mysqlMigrationForeignColumn/g, foreignColumnName)
        .replace(/mysql_migration_index/g, indexName);
    } catch (e) {
      CodegenHelper.logError(className, e);
      process.exit(1);
    }
  }

  private getMigration(filePath: string): MigrationMysqlCliInterface | undefined {
    try {
      const module = loadModule(`${this.configuration.pathMigration}/${this.getMigrationFileName(filePath)}`) as Record<
        string,
        unknown
      >;
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
        CodegenHelper.logError(filePath, new Error(`No valid constructor in: ${filePath}`));
        process.exit(1);
        return;
      }
      return new ClassToLoad();
    } catch (e) {
      CodegenHelper.logError(filePath, e);
      process.exit(1);
      return;
    }
  }

  private async executeMigrationUp(connection: Connection, migrationTable: string, filePath: string): Promise<void> {
    const migration = this.getMigration(filePath);
    if (!migration) return;
    try {
      await migration.up(connection);
      await connection.execute(`INSERT INTO ${migrationTable} (filename) VALUES (?)`, [
        this.normalizeMigrationFileName(filePath),
      ]);
      CodegenHelper.logSuccess(migration.constructor.name, filePath);
    } catch (e) {
      CodegenHelper.logError(migration.constructor.name, e);
      process.exit(1);
    }
  }

  private async executeMigrationDown(
    connection: Connection,
    migrationTable: string,
    migrationLog: SchemaMigrationRow,
  ): Promise<void> {
    const migration = this.getMigration(migrationLog.fileName);
    if (!migration) return;
    try {
      await migration.down(connection);
      await connection.execute(`DELETE FROM ${migrationTable} WHERE id = ?`, [migrationLog.id]);
      CodegenHelper.logSuccess(migration.constructor.name, migrationLog.fileName);
    } catch (e) {
      CodegenHelper.logError(migration.constructor.name, e);
      process.exit(1);
    }
  }

  private quoteIdentifier(identifier: string): string {
    if (!/^[a-z0-9_]+$/i.test(identifier)) {
      throw new Error(`Invalid MySQL identifier: ${identifier}`);
    }
    return `\`${identifier}\``;
  }

  private async acquireLock(connection: Connection): Promise<string> {
    const lockName = `${this.configuration.database}:${this.configuration.table}`;
    const [lockRows] = await connection.execute<MigrationLockRow[]>('SELECT GET_LOCK(?, 30) AS acquired', [lockName]);
    if (lockRows[0]?.acquired !== 1) {
      throw new Error(`Timed out waiting for migration lock ${lockName}`);
    }
    return lockName;
  }

  private async releaseLock(connection: Connection, lockName: string): Promise<void> {
    await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
  }

  private async createMigrationTable(connection: Connection, migrationTable: string): Promise<void> {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ${migrationTable} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        filename VARCHAR(255) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY ${this.quoteIdentifier(`${this.configuration.table}_filename_unique`)} (filename)
      ) ENGINE=InnoDB
    `);
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

  private getMigrationExtension(): '.ts' | '.js' {
    return this.isTypeScriptExecution() ? '.ts' : '.js';
  }

  private getMigrationFileFilter(): RegExp[] {
    return [this.getMigrationExtension() === '.ts' ? /\.ts$/ : /\.js$/];
  }

  private normalizeMigrationFileName(fileName: string): string {
    return fileName.replace(MigrationMysqlCliClass.migrationFileExtensionRegexp, '');
  }

  private scanMigrationFiles(): string[] {
    return IoHelper.scanFilesSync(this.configuration.pathMigration, { filter: this.getMigrationFileFilter() }).map(
      (filePath) => DataHelper.excludePath(filePath, this.configuration.pathMigration),
    );
  }

  private getMigrationFileName(fileName: string): string {
    return `${this.normalizeMigrationFileName(fileName)}${this.getMigrationExtension()}`;
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
