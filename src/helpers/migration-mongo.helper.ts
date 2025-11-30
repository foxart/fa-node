import { MongoClient, WithId } from 'mongodb';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CodegenHelper } from './codegen.helper';
import { ConverterHelper } from './converter.helper';
import { DataHelper } from './data.helper';
import { IoHelper } from './io.helper';

export interface MigrationMongoInterface {
  up(db: unknown): Promise<void>;
  down(db: unknown): Promise<void>;
}

interface ConfigurationInterface {
  collection: string;
  database: string;
  path: string;
  template?: string;
  uri: string;
}

enum CommandNameEnum {
  DROP = 'drop',
  CREATE = 'create <collection>',
  UP = 'up',
  DOWN = 'down',
  RESET = 'reset',
  STATUS = 'status',
}

interface CollectionInterface {
  appliedAt: Date;
  fileName: string;
}

type CommandBuilderYargs = {
  positional: (arg0: string, arg1: yargs.Options) => void;
};

interface CommandInterface {
  name: CommandNameEnum;
  desc: string;
  builder?: (yargs: CommandBuilderYargs) => void;
  handler: (argv: { collection: string }) => void;
}

class MigrationMongoSingleton {
  private static self: MigrationMongoSingleton;

  private client!: MongoClient;

  private clientIsConnected!: boolean;

  private configuration!: ConfigurationInterface;

  private readonly commandList: CommandInterface[];

  private constructor() {
    this.clientIsConnected = false;
    this.commandList = this.getCommandList();
  }

  public static getInstance(): MigrationMongoSingleton {
    if (!MigrationMongoSingleton.self) {
      MigrationMongoSingleton.self = new MigrationMongoSingleton();
    }
    return MigrationMongoSingleton.self;
  }

  public async migrate(configuration: ConfigurationInterface): Promise<void> {
    const { collection, database, template, uri } = configuration;
    this.configuration = {
      uri: uri,
      database: database,
      collection: collection,
      path: configuration.path,
      template: template,
    };
    await this.check();
    const yargsInstance = this.commandList.reduce(
      (yargsInstance, command) =>
        yargsInstance.command(
          command.name,
          command.desc,
          // (yargsInstance: yargs.Argv) => {
          //   command.builder?.(yargsInstance as unknown as CommandBuilderYargs);
          // },
          command.builder as unknown as { [key: string]: yargs.Options },
          command.handler as unknown as (args: yargs.ArgumentsCamelCase<{ [key: string]: string }>) => void,
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
        desc: 'Drops all collections in the database',
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
        handler: (argv: { collection: string }): void => {
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
      CodegenHelper.logError(this.check.name, e as Error);
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
    const filePath = `${this.configuration.path}/${fileName}.ts`;
    IoHelper.createFileSync(filePath, this.getTemplate(timestamp, migrationName));
    CodegenHelper.logSuccess(`${fileName}`, DataHelper.excludePath(filePath, this.configuration.path));
    process.exit(0);
  }

  private async up(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.up.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collection);
    const migrationList = await collection.find({}, { sort: { _id: 1 } }).toArray();
    const fileList = IoHelper.scanFilesSync(this.configuration.path, { filter: [/\.ts$/, /\.js$/] })
      .map((filePath) => DataHelper.excludePath(filePath, this.configuration.path))
      .filter(
        (file) =>
          !migrationList
            .map((migration) => {
              return migration.fileName;
            })
            .includes(file),
      );
    if (fileList.length) {
      for (const file of fileList) {
        await this.executeMigrationUp(file);
      }
    } else {
      CodegenHelper.logSuccess(this.configuration.collection, `No migrations to ${this.up.name}`);
    }
    process.exit(0);
  }

  private async down(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.down.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collection);
    const migrationList = await collection.findOne({}, { sort: { _id: -1 } });
    if (migrationList) {
      await this.executeMigrationDown(migrationList);
    } else {
      CodegenHelper.logSuccess(this.configuration.collection, `No migrations to ${this.down.name}`);
    }
    process.exit(0);
  }

  private async reset(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.reset.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collection);
    const migrationList = await collection.find({}, { sort: { _id: -1 } }).toArray();
    if (migrationList.length) {
      for (const log of migrationList) {
        await this.executeMigrationDown(log);
      }
    } else {
      CodegenHelper.logSuccess(this.configuration.collection, `No migrations to ${this.reset.name}`);
    }
    process.exit(0);
  }

  private async status(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.status.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collection);
    const migrationList = await collection.find({}, { sort: { _id: 1 } }).toArray();
    const migrationsSet = new Set(migrationList.map((log) => log.fileName));
    const fileList = IoHelper.scanFilesSync(this.configuration.path, { filter: [/\.ts$/, /\.js$/] }).map((filePath) =>
      DataHelper.excludePath(filePath, this.configuration.path),
    );
    if (!fileList.length) {
      CodegenHelper.logSuccess(this.configuration.collection, 'No migration files found.');
      process.exit(0);
    }
    for (const file of fileList) {
      const isApplied = migrationsSet.has(file);
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
    console.log({ migrationName, pascalCase });
    const className = `${pascalCase}_${timestamp}`;
    const collectionName = `${camelCase}_${timestamp}`;
    const fieldName = `${camelCase}_${timestamp}`;
    const indexName = `${migrationName.replace(/-/g, '_')}_${timestamp}`;
    try {
      const template = this.configuration.template
        ? // ? "import { Db } from 'mongodb';\n" +
          //   "import { MigrationMongoInterface } from 'fa-node';\n" +
          //   '\n' +
          //   '/**\n' +
          //   ' * MongoMigrationClass\n' +
          //   ' */\n' +
          //   '\n' +
          //   "const COLLECTION = 'mongoMigrationCollection';\n" +
          //   "const FIELD = 'mongoMigrationField';\n" +
          //   'const INDEX = `${FIELD}_index`;\n' +
          //   '\n' +
          //   'export class MongoMigrationClass implements MigrationMongoInterface {\n' +
          //   '  public async up(db: Db): Promise<void> {\n' +
          //   '    await db.collection(COLLECTION).createIndex(\n' +
          //   '      {\n' +
          //   '        [FIELD]: 1,\n' +
          //   '      },\n' +
          //   '      {\n' +
          //   '        name: INDEX,\n' +
          //   '        unique: true,\n' +
          //   '      },\n' +
          //   '    );\n' +
          //   '  }\n' +
          //   '\n' +
          //   '  public async down(db: Db): Promise<void> {\n' +
          //   '    await db.collection(COLLECTION).dropIndex(INDEX);\n' +
          //   '  }\n' +
          //   '}\n'
          IoHelper.readFileSync(this.configuration.template).toString()
        : IoHelper.readFileSync(`${__dirname}/migration-mongo.template`).toString();
      return template
        .replace(/MongoMigrationClass/g, className)
        .replace(/mongoMigrationCollection/g, collectionName)
        .replace(/mongoMigrationField/g, fieldName)
        .replace(/mongo_migration_index/g, indexName);
    } catch (e) {
      CodegenHelper.logError(className, e as Error);
      process.exit(1);
    }
  }

  private async getMigration(filePath: string): Promise<MigrationMongoInterface> {
    try {
      const module = (await import(`${this.configuration.path}/${filePath}`)) as Record<string, unknown>;
      const className = Object.keys(module).find((key) => typeof module[key] === 'function');
      if (!className) {
        CodegenHelper.logError(filePath, new Error(`No valid constructor in: ${filePath}`));
        process.exit(1);
      }
      const ClassToLoad = module[className] as new () => MigrationMongoInterface;
      return new ClassToLoad();
    } catch (e) {
      CodegenHelper.logError(filePath, e as Error);
      process.exit(1);
    }
  }

  private async executeMigrationUp(filePath: string): Promise<void> {
    const migration = await this.getMigration(filePath);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collection);
    try {
      await migration.up(db);
      await collection.insertOne({
        appliedAt: new Date(),
        fileName: filePath,
      });
      CodegenHelper.logSuccess(migration.constructor.name, filePath);
    } catch (e) {
      CodegenHelper.logError(migration.constructor.name, e as Error);
      process.exit(1);
    }
  }

  private async executeMigrationDown(log: WithId<CollectionInterface>): Promise<void> {
    const migration = await this.getMigration(log.fileName);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const collection = db.collection<CollectionInterface>(this.configuration.collection);
    try {
      await migration.down(db);
      await collection.deleteOne({ _id: log._id });
      CodegenHelper.logSuccess(migration.constructor.name, log.fileName);
    } catch (e) {
      CodegenHelper.logError(migration.constructor.name, e as Error);
      process.exit(1);
    }
  }
}

export const MigrationMongoHelper = MigrationMongoSingleton.getInstance();
