import { createClient, type ClickHouseClient } from '@clickhouse/client';
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

export interface MigrationClickhouseCliInterface {
  up(client: ClickHouseClient, database: string): Promise<void>;
  down(client: ClickHouseClient, database: string): Promise<void>;
}

interface ConfigurationInterface extends MigrationAbstractConfiguration {
  username: string;
  password: string;
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

interface SchemaMigrationRow {
  appliedAt: string;
  fileName: string;
}

interface DatabaseTableRow {
  tableName: string;
}

class MigrationClickhouseCliClass extends MigrationAbstractCli<ConfigurationInterface> {
  private client!: ClickHouseClient;

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

  private getClickhouseClient(): ClickHouseClient {
    if (!this.client) {
      this.client = createClient({
        url: this.configuration.uri,
        database: this.configuration.database,
        username: this.configuration.username,
        password: this.configuration.password,
        request_timeout: 120000,
        clickhouse_settings: {
          wait_end_of_query: 1,
        },
      });
    }
    return this.client;
  }

  protected async check(): Promise<void> {
    try {
      const client = this.getClickhouseClient();
      const result = await client.query({ query: 'SELECT 1 AS value', format: 'JSONEachRow' });
      await result.json<{ value: number }>();
    } catch (error) {
      CodegenHelper.logError(this.check.name, error);
      process.exit(1);
    }
  }

  private async drop(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.drop.name);
    const client = this.getClickhouseClient();
    const result = await client.query({
      query: `
        SELECT name AS tableName
        FROM system.tables
        WHERE database = {database:String}
          AND is_temporary = 0
        ORDER BY name
      `,
      query_params: { database: this.configuration.database },
      format: 'JSONEachRow',
    });
    const tableList = await result.json<DatabaseTableRow>();
    if (tableList.length === 0) {
      CodegenHelper.logSuccess(this.configuration.database, 'No tables to drop');
      process.exit(0);
    }
    for (const { tableName } of tableList) {
      await client.command({ query: `DROP TABLE IF EXISTS ${this.quoteIdentifier(tableName)}` });
      CodegenHelper.logSuccess(this.configuration.database, `Dropped table: ${tableName}`);
    }
    CodegenHelper.logSuccess(this.configuration.database, 'All tables dropped');
    process.exit(0);
  }

  private async up(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.up.name);
    const client = this.getClickhouseClient();
    const migrationTable = this.quoteIdentifier(this.configuration.tableMigration);
    await this.createMigrationTable(client, migrationTable);
    const migrationList = await this.getAppliedMigrationList(client, migrationTable, false);
    const migrationSet = new Set(migrationList.map((migration) => this.normalizeMigrationFileName(migration.fileName)));
    const fileList = this.scanMigrationFiles().filter(
      (file) => !migrationSet.has(this.normalizeMigrationFileName(file)),
    );
    if (fileList.length) {
      for (const file of fileList) {
        await this.executeMigrationUp(client, file);
      }
    } else {
      CodegenHelper.logSuccess(this.configuration.tableMigration, `No migrations to ${this.up.name}`);
    }
    process.exit(0);
  }

  private async down(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.down.name);
    const client = this.getClickhouseClient();
    const migrationTable = this.quoteIdentifier(this.configuration.tableMigration);
    await this.createMigrationTable(client, migrationTable);
    const migrationList = await this.getAppliedMigrationList(client, migrationTable);
    const migration = migrationList[0];
    if (migration) {
      await this.executeMigrationDown(client, migrationTable, migration);
    } else {
      CodegenHelper.logSuccess(this.configuration.tableMigration, `No migrations to ${this.down.name}`);
    }
    process.exit(0);
  }

  private async reset(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.reset.name);
    const client = this.getClickhouseClient();
    const migrationTable = this.quoteIdentifier(this.configuration.tableMigration);
    await this.createMigrationTable(client, migrationTable);
    const migrationList = await this.getAppliedMigrationList(client, migrationTable);
    if (migrationList.length) {
      for (const migration of migrationList) {
        await this.executeMigrationDown(client, migrationTable, migration);
      }
    } else {
      CodegenHelper.logSuccess(this.configuration.tableMigration, `No migrations to ${this.reset.name}`);
    }
    process.exit(0);
  }

  private async status(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.status.name);
    const client = this.getClickhouseClient();
    const migrationTable = this.quoteIdentifier(this.configuration.tableMigration);
    await this.createMigrationTable(client, migrationTable);
    const migrationList = await this.getAppliedMigrationList(client, migrationTable, false);
    const migrationSet = new Set(migrationList.map((migration) => this.normalizeMigrationFileName(migration.fileName)));
    const fileList = this.scanMigrationFiles();
    if (!fileList.length) {
      CodegenHelper.logSuccess(this.configuration.tableMigration, 'No migration files found.');
      process.exit(0);
    }
    for (const file of fileList) {
      const isApplied = migrationSet.has(this.normalizeMigrationFileName(file));
      if (isApplied) {
        CodegenHelper.logSuccess(file, 'APPLIED');
      } else {
        CodegenHelper.logWarning(file, 'PENDING');
      }
    }
    process.exit(0);
  }

  protected getTemplate(timestamp: number, migrationName: string): string {
    const pascalCase = ConverterHelper.toPascalCase(migrationName, '-');
    const camelCase = ConverterHelper.toCamelCase(migrationName, '-');
    const className = `${pascalCase}_${timestamp}`;
    const tableName = `${migrationName.replace(/-/g, '_')}_${timestamp}`;
    const columnName = `${camelCase}_${timestamp}`;
    try {
      const template = this.configuration.template
        ? IoHelper.readFileSync(this.configuration.template).toString()
        : IoHelper.readFileSync(`${__dirname}/migration-clickhouse.template.ts`).toString();
      return template
        .replace(/ClickhouseMigrationClass/g, className)
        .replace(/clickhouseMigrationTable/g, tableName)
        .replace(/clickhouseMigrationColumn/g, columnName);
    } catch (error) {
      CodegenHelper.logError(className, error);
      process.exit(1);
    }
  }

  private getMigration(filePath: string): MigrationClickhouseCliInterface | undefined {
    try {
      const module = loadModule(`${this.configuration.pathMigration}/${this.getMigrationFileName(filePath)}`) as Record<
        string,
        unknown
      >;
      const exports = Object.values(module).flatMap((value): unknown[] =>
        typeof value === 'object' && value !== null ? Object.values(value as Record<string, unknown>) : [value],
      );
      const ClassToLoad = exports.find(
        (value): value is new () => MigrationClickhouseCliInterface =>
          typeof value === 'function' &&
          typeof (value as { prototype?: Partial<MigrationClickhouseCliInterface> }).prototype?.up === 'function' &&
          typeof (value as { prototype?: Partial<MigrationClickhouseCliInterface> }).prototype?.down === 'function',
      );
      if (!ClassToLoad) {
        CodegenHelper.logError(filePath, new Error(`No valid constructor in: ${filePath}`));
        process.exit(1);
      }
      return new ClassToLoad();
    } catch (error) {
      CodegenHelper.logError(filePath, error);
      process.exit(1);
    }
  }

  private async executeMigrationUp(client: ClickHouseClient, filePath: string): Promise<void> {
    const migration = this.getMigration(filePath);
    if (!migration) return;
    try {
      await migration.up(client, this.configuration.database);
      await client.insert({
        table: this.configuration.tableMigration,
        values: [
          {
            applied_at: new Date().toISOString().replace('T', ' ').replace('Z', ''),
            filename: this.normalizeMigrationFileName(filePath),
          },
        ],
        format: 'JSONEachRow',
      });
      CodegenHelper.logSuccess(migration.constructor.name, filePath);
    } catch (error) {
      CodegenHelper.logError(migration.constructor.name, error);
      process.exit(1);
    }
  }

  private async executeMigrationDown(
    client: ClickHouseClient,
    migrationTable: string,
    migrationLog: SchemaMigrationRow,
  ): Promise<void> {
    const migration = this.getMigration(migrationLog.fileName);
    if (!migration) return;
    try {
      await migration.down(client, this.configuration.database);
      await client.command({
        query: `ALTER TABLE ${migrationTable} DELETE WHERE filename = {filename:String}`,
        query_params: { filename: this.normalizeMigrationFileName(migrationLog.fileName) },
        clickhouse_settings: { mutations_sync: '2' },
      });
      CodegenHelper.logSuccess(migration.constructor.name, migrationLog.fileName);
    } catch (error) {
      CodegenHelper.logError(migration.constructor.name, error);
      process.exit(1);
    }
  }

  private quoteIdentifier(identifier: string): string {
    if (!/^[a-z0-9_]+$/i.test(identifier)) {
      throw new Error(`Invalid ClickHouse identifier: ${identifier}`);
    }
    return `\`${identifier}\``;
  }

  private async createMigrationTable(client: ClickHouseClient, migrationTable: string): Promise<void> {
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS ${migrationTable} (
          applied_at DateTime64(3, 'UTC'),
          filename String
        ) ENGINE = MergeTree
        ORDER BY (applied_at, filename)
      `,
    });
  }

  private async getAppliedMigrationList(
    client: ClickHouseClient,
    migrationTable: string,
    descending = true,
  ): Promise<SchemaMigrationRow[]> {
    const result = await client.query({
      query: `
        SELECT applied_at AS appliedAt, filename AS fileName
        FROM ${migrationTable}
        ORDER BY applied_at ${descending ? 'DESC' : 'ASC'}, filename ${descending ? 'DESC' : 'ASC'}
      `,
      format: 'JSONEachRow',
    });
    return result.json<SchemaMigrationRow>();
  }
}

export const MigrationClickhouseCli: MigrationClickhouseCliClass = new MigrationClickhouseCliClass();
