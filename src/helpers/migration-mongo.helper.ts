import { MongoClient, WithId } from 'mongodb';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CodegenHelper } from './codegen.helper';
import { ConverterHelper } from './converter.helper';
import { IoHelper } from './io.helper';
import { ParserHelper } from './parser.helper';

interface MigrationMongoConfigurationInterface {
  database: string;
  collection: string;
  path: string;
  template?: string;
  uri: string;
}

export interface MigrationMongoInterface {
  up(db: unknown): Promise<void>;

  down(db: unknown): Promise<void>;
}

interface MigrationLogInterface {
  dateTime: Date;
  fileName: string;
}

interface CommandInterface {
  name: string;
  desc: string;
  builder?: (yargs: CommandBuilderYargs) => void;
  handler: (argv: { collection: string }) => void;
}

type CommandBuilderYargs = {
  positional: (arg0: string, arg1: yargs.Options) => void;
};

interface ConfigurationInterface {
  uri: string;
  database: string;
  collection: string;
  path: string;
  template?: string;
}

class MigrationMongoClass {
  private static self: MigrationMongoClass;

  private client!: MongoClient;

  private clientIsConnected!: boolean;

  private configuration!: ConfigurationInterface;

  private readonly commandList: CommandInterface[];

  private constructor() {
    this.clientIsConnected = false;
    this.commandList = this.getCommandList();
  }

  public static getInstance(): MigrationMongoClass {
    if (!MigrationMongoClass.self) {
      MigrationMongoClass.self = new MigrationMongoClass();
    }
    return MigrationMongoClass.self;
  }

  public async migrate(configuration: MigrationMongoConfigurationInterface): Promise<void> {
    const { collection, database, template, uri } = configuration;
    this.configuration = {
      uri: uri,
      database,
      collection,
      path: `${process.cwd()}/${configuration.path}`,
      template,
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
        name: this.drop.name,
        desc: 'Drops all collections in the database',
        builder: emptyBuilder,
        handler: (): void => void this.drop(),
      },
      {
        name: `${this.create.name} <collection>`,
        desc: 'Creates migration',
        builder: (yargs: CommandBuilderYargs): void => {
          yargs.positional('collection', {
            describe: 'The collection name for the migration',
            type: 'string',
          });
        },
        handler: (argv: { collection: string }): void => void this.create(argv.collection),
      },
      {
        name: this.up.name,
        desc: 'Applies migration',
        builder: emptyBuilder,
        handler: (): void => void this.up(),
      },
      {
        name: this.down.name,
        desc: 'Revokes migration',
        builder: emptyBuilder,
        handler: (): void => void this.down(),
      },
      {
        name: this.reset.name,
        desc: 'Revokes migration',
        builder: emptyBuilder,
        handler: (): void => void this.reset(),
      },
      {
        name: 'status',
        desc: 'Lists all migrations',
        builder: emptyBuilder,
        handler: (): void => {
          console.log('Listing migrations...');
        },
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
    const migrationName = ConverterHelper.upperToSeparator(migration.replace(/[^a-zA-Z0-9-]/g, ''), '-').toLowerCase();
    const filePath = `${this.configuration.path}/${timestamp}_${migrationName}.ts`;
    IoHelper.createFileSync(filePath, this.getTemplate(timestamp, migrationName));
    CodegenHelper.logSuccess(
      `${ConverterHelper.separatorToPascal(migrationName, '-')}_${timestamp}`,
      ParserHelper.excludePath(this.configuration.path, filePath),
    );
    process.exit(0);
  }

  private async up(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.up.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const logCollection = db.collection<MigrationLogInterface>(this.configuration.collection);
    const logList = await logCollection.find({}, { sort: { _id: 1 } }).toArray();
    const fileList = IoHelper.scanFilesSync(this.configuration.path, { filter: [/\.ts$/, /\.js$/] })
      .map((file) => ParserHelper.excludePath(this.configuration.path, file))
      .filter((file) => !logList.map((log) => log.fileName).includes(file));
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
    const logCollection = db.collection<MigrationLogInterface>(this.configuration.collection);
    const log = await logCollection.findOne({}, { sort: { _id: -1 } });
    if (log) {
      await this.executeMigrationDown(log);
    } else {
      CodegenHelper.logSuccess(this.configuration.collection, `No migrations to ${this.down.name}`);
    }
    process.exit(0);
  }

  private async reset(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.reset.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const logCollection = db.collection<MigrationLogInterface>(this.configuration.collection);
    const logList = await logCollection.find({}, { sort: { _id: -1 } }).toArray();
    if (logList.length) {
      for (const log of logList) {
        await this.executeMigrationDown(log);
      }
    } else {
      CodegenHelper.logSuccess(this.configuration.collection, `No migrations to ${this.reset.name}`);
    }
    process.exit(0);
  }

  private getTemplate(timestamp: number, migrationName: string): string {
    const className = `${ConverterHelper.separatorToPascal(migrationName, '-')}_${timestamp}`;
    const collectionName = `${ConverterHelper.separatorToCamel(migrationName, '-')}_${timestamp}`;
    const fieldName = `${ConverterHelper.separatorToCamel(migrationName, '-')}_${timestamp}`;
    const indexName = `${migrationName.replace(/-/g, '_')}_${timestamp}`;
    try {
      const template = !this.configuration.template
        ? "import { Db } from 'mongodb';\n" +
          "import { MigrationMongoInterface } from 'fa-node';\n" +
          '\n' +
          '/**\n' +
          ' * MongoMigrationClass\n' +
          ' */\n' +
          '\n' +
          "const COLLECTION = 'mongoMigrationCollection';\n" +
          "const FIELD = 'mongoMigrationField';\n" +
          "const INDEX = '${FIELD}_index';\n" +
          '\n' +
          'export class MongoMigrationClass implements MigrationMongoInterface {\n' +
          '  public async up(db: Db): Promise<void> {\n' +
          '    await db.collection(COLLECTION).createIndex(\n' +
          '      {\n' +
          '        [FIELD]: 1,\n' +
          '      },\n' +
          '      {\n' +
          '        name: INDEX,\n' +
          '        unique: true,\n' +
          '      },\n' +
          '    );\n' +
          '  }\n' +
          '\n' +
          '  public async down(db: Db): Promise<void> {\n' +
          '    await db.collection(COLLECTION).dropIndex(INDEX);\n' +
          '  }\n' +
          '}\n'
        : IoHelper.readFileSync(this.configuration.template).toString();
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
    const logCollection = db.collection<MigrationLogInterface>(this.configuration.collection);
    try {
      await migration.up(db);
      await logCollection.insertOne({
        dateTime: new Date(),
        fileName: filePath,
      });
      CodegenHelper.logSuccess(migration.constructor.name, filePath);
    } catch (e) {
      CodegenHelper.logError(migration.constructor.name, e as Error);
      process.exit(1);
    }
  }

  private async executeMigrationDown(log: WithId<MigrationLogInterface>): Promise<void> {
    const migration = await this.getMigration(log.fileName);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const logCollection = db.collection<MigrationLogInterface>(this.configuration.collection);
    try {
      await migration.down(db);
      await logCollection.deleteOne({ _id: log._id });
      CodegenHelper.logSuccess(migration.constructor.name, log.fileName);
    } catch (e) {
      CodegenHelper.logError(migration.constructor.name, e as Error);
      process.exit(1);
    }
  }
}

export const MigrationMongoHelper = MigrationMongoClass.getInstance();
