import type { Connection, RowDataPacket } from 'mysql2/promise';
import { createConnection } from 'mysql2/promise';
import { createRequire } from 'node:module';
import { CodegenHelper } from '../helpers/codegen.helper';
import { ConverterHelper } from '../helpers/converter.helper';
import { IoHelper } from '../helpers/io.helper';
import {
  MigrationAbstractCli,
  type CommandBuilderYargs,
  type CommandInterface,
  type MigrationAbstractConfiguration,
} from './migration-abstract.cli';

const loadModule = createRequire(__filename);

export interface MigrationMysqlCliInterface {
  up(connection: Connection): Promise<void>;
  down(connection: Connection): Promise<void>;
}

interface ConfigurationInterface extends MigrationAbstractConfiguration {
  tableMigration: string;
  tableSeeder: string;
  template?: string;
}

enum CommandNameEnum {
  DROP = 'drop',
  CREATE = 'create <migration>',
  UP = 'up',
  DOWN = 'down',
  RESET = 'reset',
  STATUS = 'status',
  SEEDER_CREATE = 'seederCreate <migration>',
  SEEDER_UP = 'seederUp',
  SEEDER_DOWN = 'seederDown',
  SEEDER_RESET = 'seederReset',
  SEEDER_STATUS = 'seederStatus',
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

class MigrationMysqlCliClass extends MigrationAbstractCli<ConfigurationInterface> {

  private connection!: Connection;

  protected readonly commandList: CommandInterface[];

  public constructor() {
    super();
    this.commandList = this.getCommandList();
  }

  private getCommandList(): CommandInterface[] {
    const emptyBuilder = (): void => {
      return;
    };
    return [
      {
        name: CommandNameEnum.DROP,
        desc: 'Drops ALL tables in the database',
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
        desc: 'Revokes ALL migrations',
        builder: emptyBuilder,
        handler: (): void => void this.reset(),
      },
      {
        name: CommandNameEnum.STATUS,
        desc: 'Lists ALL migrations',
        builder: emptyBuilder,
        handler: (): void => void this.status(),
      },
      {
        name: CommandNameEnum.SEEDER_CREATE,
        desc: 'Creates seeder',
        builder: (yargs: CommandBuilderYargs): void => {
          yargs.positional('migration', {
            describe: 'The seeder name',
            type: 'string',
          });
        },
        handler: (argv): void => {
          if (typeof argv.migration !== 'string') {
            throw new Error('Migration argument is required');
          }
          void this.seederCreate(argv.migration);
        },
      },
      {
        name: CommandNameEnum.SEEDER_UP,
        desc: 'Applies seeder',
        builder: emptyBuilder,
        handler: (): void => void this.seederUp(),
      },
      {
        name: CommandNameEnum.SEEDER_DOWN,
        desc: 'Revokes seeder',
        builder: emptyBuilder,
        handler: (): void => void this.seederDown(),
      },
      {
        name: CommandNameEnum.SEEDER_RESET,
        desc: 'Revokes ALL seeders',
        builder: emptyBuilder,
        handler: (): void => void this.seederReset(),
      },
      {
        name: CommandNameEnum.SEEDER_STATUS,
        desc: 'Lists ALL seeders',
        builder: emptyBuilder,
        handler: (): void => void this.seederStatus(),
      },
    ];
  }

  private useSeederConfiguration(): void {
    this.configuration = {
      ...this.configuration,
      pathMigration: this.configuration.pathSeeder,
      tableMigration: this.configuration.tableSeeder,
    };
  }

  private seederCreate(seeder: string): Promise<void> {
    this.useSeederConfiguration();
    return this.create(seeder);
  }

  private async seederUp(): Promise<void> {
    this.useSeederConfiguration();
    await this.up();
  }

  private async seederDown(): Promise<void> {
    this.useSeederConfiguration();
    await this.down();
  }

  private async seederReset(): Promise<void> {
    this.useSeederConfiguration();
    await this.reset();
  }

  private async seederStatus(): Promise<void> {
    this.useSeederConfiguration();
    await this.status();
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

  protected async check(): Promise<void> {
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
    this.quoteIdentifier(this.configuration.tableMigration);
    const connection = await this.getMysqlConnection();
    const lockName = await this.acquireLock(connection);
    const [tableList] = await connection.execute<DatabaseTableRow[]>(
      `
        SELECT TABLE_NAME AS tableName
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `,
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

  private async up(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.up.name);
    const migrationTable = this.quoteIdentifier(this.configuration.tableMigration);
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
      CodegenHelper.logSuccess(this.configuration.tableMigration, `No migrations to ${this.up.name}`);
    }
    await this.releaseLock(connection, lockName);
    process.exit(0);
  }

  private async down(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.down.name);
    const migrationTable = this.quoteIdentifier(this.configuration.tableMigration);
    const connection = await this.getMysqlConnection();
    const lockName = await this.acquireLock(connection);
    await this.createMigrationTable(connection, migrationTable);
    const migrationList = await this.getAppliedMigrationList(connection, migrationTable);
    const migration = migrationList[0];
    if (migration) {
      await this.executeMigrationDown(connection, migrationTable, migration);
    } else {
      CodegenHelper.logSuccess(this.configuration.tableMigration, `No migrations to ${this.down.name}`);
    }
    await this.releaseLock(connection, lockName);
    process.exit(0);
  }

  private async reset(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.reset.name);
    const migrationTable = this.quoteIdentifier(this.configuration.tableMigration);
    const connection = await this.getMysqlConnection();
    const lockName = await this.acquireLock(connection);
    await this.createMigrationTable(connection, migrationTable);
    const migrationList = await this.getAppliedMigrationList(connection, migrationTable);
    if (migrationList.length) {
      for (const migration of migrationList) {
        await this.executeMigrationDown(connection, migrationTable, migration);
      }
    } else {
      CodegenHelper.logSuccess(this.configuration.tableMigration, `No migrations to ${this.reset.name}`);
    }
    await this.releaseLock(connection, lockName);
    process.exit(0);
  }

  private async status(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.status.name);
    const migrationTable = this.quoteIdentifier(this.configuration.tableMigration);
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
      CodegenHelper.logSuccess(this.configuration.tableMigration, 'No migration files found.');
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

  protected getTemplate(timestamp: number, migrationName: string): string {
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
      }
      return new ClassToLoad();
    } catch (e) {
      CodegenHelper.logError(filePath, e);
      process.exit(1);
    }
  }

  private async executeMigrationUp(connection: Connection, migrationTable: string, filePath: string): Promise<void> {
    const migration = this.getMigration(filePath);
    if (!migration) return;
    try {
      await migration.up(connection);
      await connection.execute(
        `
        INSERT INTO ${migrationTable} (filename)
        VALUES (?)
      `,
        [this.normalizeMigrationFileName(filePath)],
      );
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
      await connection.execute(
        `
        DELETE
        FROM ${migrationTable}
        WHERE id = ?
      `,
        [migrationLog.id],
      );
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
    const lockName = `${this.configuration.database}:${this.configuration.tableMigration}`;
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
        UNIQUE KEY ${this.quoteIdentifier(`${this.configuration.tableMigration}_filename_unique`)} (filename)
      ) ENGINE=InnoDB
    `);
  }

  private async getAppliedMigrationList(
    connection: Connection,
    migrationTable: string,
    descending = true,
  ): Promise<SchemaMigrationRow[]> {
    const [rows] = await connection.query<SchemaMigrationRow[]>(`
        SELECT id, applied_at AS appliedAt, filename AS fileName
        FROM ${migrationTable}
        ORDER BY id ${descending ? 'DESC' : 'ASC'}
      `);
    return rows;
  }

}

export const MigrationMysqlCli: MigrationMysqlCliClass = new MigrationMysqlCliClass();
