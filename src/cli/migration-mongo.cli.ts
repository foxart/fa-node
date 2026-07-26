import { MongoClient, WithId } from 'mongodb';
import { createRequire } from 'node:module';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CodegenHelper } from '../helpers/codegen.helper';
import { ConverterHelper } from '../helpers/converter.helper';
import { DataHelper } from '../helpers/data.helper';
import { IoHelper } from '../helpers/io.helper';

const loadModule = createRequire(__filename);

export interface MigrationMongoCliInterface {
  up(db: unknown): Promise<void>;
  down(db: unknown): Promise<void>;
}

interface ConfigurationInterface {
  pathMigration: string;
  pathSeeder: string;
  uri: string;
  database: string;
  collectionMigration: string;
  collectionSeeder: string;
  template?: string;
}

enum CommandNameEnum {
  DROP = 'drop',
  CREATE = 'create <collection>',
  UP = 'up',
  DOWN = 'down',
  RESET = 'reset',
  STATUS = 'status',
  SEEDER_CREATE = 'seederCreate <collection>',
  SEEDER_UP = 'seederUp',
  SEEDER_DOWN = 'seederDown',
  SEEDER_RESET = 'seederReset',
  SEEDER_STATUS = 'seederStatus',
}

interface CollectionInterface {
  appliedAt: Date;
  fileName: string;
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

class MigrationMongoCliClass {
  private static readonly migrationFileExtensionRegexp = /\.(ts|js)$/;

  private client!: MongoClient;

  private clientIsConnected!: boolean;

  private configuration!: ConfigurationInterface;

  private readonly commandList: CommandInterface[];

  public constructor() {
    this.clientIsConnected = false;
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
        yargsInstance.showHelp();
        process.exit(1);
      })
      .wrap(100)
      .help().argv;
  }

  private getCommandList(): CommandInterface[] {
    const emptyBuilder = (): void => {
      return;
    };
    return [
      {
        name: CommandNameEnum.DROP,
        desc: 'Drops ALL collections in the database',
        builder: emptyBuilder,
        handler: (): void => void this.drop(),
      },
      {
        name: CommandNameEnum.CREATE,
        desc: 'Creates migration',
        builder: (yargs: CommandBuilderYargs): void => {
          yargs.positional('collection', {
            describe: 'The collection name for the migration',
            type: 'string',
          });
        },
        handler: (argv): void => {
          if (typeof argv.collection !== 'string') {
            throw new Error('Collection argument is required');
          }
          void this.create(argv.collection);
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
          yargs.positional('collection', {
            describe: 'The collection name for the seeder',
            type: 'string',
          });
        },
        handler: (argv): void => {
          if (typeof argv.collection !== 'string') {
            throw new Error('Collection argument is required');
          }
          void this.seederCreate(argv.collection);
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
      collectionMigration: this.configuration.collectionSeeder,
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

  private async getMongoClient(): Promise<MongoClient> {
    if (!this.client) {
      this.client = new MongoClient(this.configuration.uri, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
    }
    if (!this.clientIsConnected) {
      await Promise.race([
        this.client.connect().then(() => {
          this.clientIsConnected = true;
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }),
      ]);
    }
    return this.client;
  }

  private async check(): Promise<void> {
    try {
      const client = await this.getMongoClient();
      const db = client.db(this.configuration.database);
      await db.collections();
    } catch (e) {
      CodegenHelper.logError(this.check.name, e);
      process.exit(1);
    }
  }

  private async drop(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.drop.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collectionList = await db.collections();
    if (collectionList.length === 0) {
      CodegenHelper.logSuccess(this.configuration.database, 'No collections to drop');
      process.exit(0);
    }
    for (const collection of collectionList) {
      await collection.drop();
      CodegenHelper.logSuccess(this.configuration.database, `Dropped collection: ${collection.collectionName}`);
    }
    CodegenHelper.logSuccess(this.configuration.database, 'All collections dropped');
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
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collectionMigration);
    const migrationList = await collection.find({}, { sort: { _id: 1 } }).toArray();
    const migrationSet = new Set(migrationList.map((migration) => this.normalizeMigrationFileName(migration.fileName)));
    const fileList = this.scanMigrationFiles().filter(
      (file) => !migrationSet.has(this.normalizeMigrationFileName(file)),
    );
    if (fileList.length) {
      for (const file of fileList) {
        await this.executeMigrationUp(file);
      }
    } else {
      CodegenHelper.logSuccess(this.configuration.collectionMigration, `No migrations to ${this.up.name}`);
    }
    process.exit(0);
  }

  private async down(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.down.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collectionMigration);
    const migrationList = await collection.findOne({}, { sort: { _id: -1 } });
    if (migrationList) {
      await this.executeMigrationDown(migrationList);
    } else {
      CodegenHelper.logSuccess(this.configuration.collectionMigration, `No migrations to ${this.down.name}`);
    }
    process.exit(0);
  }

  private async reset(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.reset.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collectionMigration);
    const migrationList = await collection.find({}, { sort: { _id: -1 } }).toArray();
    if (migrationList.length) {
      for (const log of migrationList) {
        await this.executeMigrationDown(log);
      }
    } else {
      CodegenHelper.logSuccess(this.configuration.collectionMigration, `No migrations to ${this.reset.name}`);
    }
    process.exit(0);
  }

  private async status(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.status.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collectionMigration);
    const migrationList = await collection.find({}, { sort: { _id: 1 } }).toArray();
    const migrationsSet = new Set(migrationList.map((log) => this.normalizeMigrationFileName(log.fileName)));
    const fileList = this.scanMigrationFiles();
    if (!fileList.length) {
      CodegenHelper.logSuccess(this.configuration.collectionMigration, 'No migration files found.');
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
    process.exit(0);
  }

  /**
   *
   */
  private getTemplate(timestamp: number, migrationName: string): string {
    const pascalCase = ConverterHelper.toPascalCase(migrationName, '-');
    const camelCase = ConverterHelper.toCamelCase(migrationName, '-');
    const className = `${pascalCase}_${timestamp}`;
    const collectionName = `${camelCase}_${timestamp}`;
    const fieldName = `${camelCase}_${timestamp}`;
    const indexName = `${migrationName.replace(/-/g, '_')}_${timestamp}`;
    try {
      const template = this.configuration.template
        ? IoHelper.readFileSync(this.configuration.template).toString()
        : IoHelper.readFileSync(`${__dirname}/migration-mongo.template.ts`).toString();
      return template
        .replace(/MongoMigrationClass/g, className)
        .replace(/mongoMigrationCollection/g, collectionName)
        .replace(/mongoMigrationField/g, fieldName)
        .replace(/mongo_migration_index/g, indexName);
    } catch (e) {
      CodegenHelper.logError(className, e);
      process.exit(1);
    }
  }

  private getMigration(filePath: string): MigrationMongoCliInterface | undefined {
    try {
      const module = loadModule(`${this.configuration.pathMigration}/${this.getMigrationFileName(filePath)}`) as Record<
        string,
        unknown
      >;
      const exports = Object.values(module).flatMap((value): unknown[] =>
        typeof value === 'object' && value !== null ? Object.values(value as Record<string, unknown>) : [value],
      );
      const ClassToLoad = exports.find(
        (value): value is new () => MigrationMongoCliInterface =>
          typeof value === 'function' &&
          typeof (value as { prototype?: Partial<MigrationMongoCliInterface> }).prototype?.up === 'function' &&
          typeof (value as { prototype?: Partial<MigrationMongoCliInterface> }).prototype?.down === 'function',
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

  private async executeMigrationUp(filePath: string): Promise<void> {
    const migration = this.getMigration(filePath);
    if (!migration) return;
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collectionMigration);
    try {
      await migration.up(db);
      await collection.insertOne({
        appliedAt: new Date(),
        fileName: this.normalizeMigrationFileName(filePath),
      });
      CodegenHelper.logSuccess(migration.constructor.name, filePath);
    } catch (e) {
      CodegenHelper.logError(migration.constructor.name, e);
      process.exit(1);
    }
  }

  private async executeMigrationDown(log: WithId<CollectionInterface>): Promise<void> {
    const migration = this.getMigration(log.fileName);
    if (!migration) return;
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collectionMigration);
    try {
      await migration.down(db);
      await collection.deleteOne({ _id: log._id });
      CodegenHelper.logSuccess(migration.constructor.name, log.fileName);
    } catch (e) {
      CodegenHelper.logError(migration.constructor.name, e);
      process.exit(1);
    }
  }

  private getMigrationExtension(): '.ts' | '.js' {
    return this.isTypeScriptExecution() ? '.ts' : '.js';
  }

  private getMigrationFileFilter(): RegExp[] {
    return [this.getMigrationExtension() === '.ts' ? /\.ts$/ : /\.js$/];
  }

  private normalizeMigrationFileName(fileName: string): string {
    return fileName.replace(MigrationMongoCliClass.migrationFileExtensionRegexp, '');
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

export const MigrationMongoCli: MigrationMongoCliClass = new MigrationMongoCliClass();
