import { Db, MongoClient } from 'mongodb';
import process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CodegenHelper } from './codegen.helper';
import { ConverterHelper } from './converter.helper';
import { IoHelper } from './io.helper';

interface MigrationMongoInterface {
  up(db: Db): Promise<void>;

  down(db: Db): Promise<void>;
}

interface MigrationLogInterface {
  class: string;
  file: string;
  status: 'applied' | 'pending' | 'revoked';
  createdAt: Date;
  appliedAt?: Date;
  revokedAt?: Date;
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
  path: string;
  collection: string;
  template: string;
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

  public migrate(configuration: ConfigurationInterface): void {
    this.configuration = configuration;
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
        name: `remove`,
        desc: 'Removes migration',
        builder: emptyBuilder,
        handler: (): void => void this.remove(),
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
      this.client = new MongoClient(this.configuration.uri);
    }
    if (!this.clientIsConnected) {
      await this.client.connect();
      this.clientIsConnected = true;
    }
    return this.client;
  }

  private async getMigration(filePath: string): Promise<MigrationMongoInterface> {
    try {
      const fullPath = `${process.cwd()}/${this.configuration.path}/${filePath}`;
      const module = (await import(fullPath)) as Record<string, unknown>;
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

  private async create(migration: string): Promise<void> {
    CodegenHelper.displayMessage('migration', this.create.name);
    const timestamp = new Date().getTime();
    const filePath = `${timestamp}_${ConverterHelper.upperToSeparator(migration, '-').toLowerCase()}.ts`;
    const className = `${ConverterHelper.separatorToCamel(migration, '-')}_${timestamp}`;
    const fullPath = `${process.cwd()}/${this.configuration.path}`;
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const logCollection = db.collection<MigrationLogInterface>(this.configuration.collection);
    if (!IoHelper.checkPath(fullPath)) {
      CodegenHelper.logError(filePath, new Error(`Path not found: ${fullPath}`));
      process.exit(1);
    }
    IoHelper.createFileSync(
      `${fullPath}/${filePath}`,
      IoHelper.readFileSync(this.configuration.template)
        .toString()
        .replace(/MigrationMongo/g, className),
    );
    await logCollection.insertOne({
      file: filePath,
      class: className,
      status: 'pending',
      createdAt: new Date(),
    });
    CodegenHelper.logSuccess(filePath, className);
    await client.close();
    process.exit(0);
  }

  private async remove(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.remove.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const logCollection = db.collection<MigrationLogInterface>(this.configuration.collection);
    const log = await logCollection.findOne(
      {},
      {
        sort: { _id: -1 },
      },
    );
    if (log) {
      if (log.status === 'applied') {
        await this.executeMigrationDown(db, log);
      }
      await logCollection.deleteOne({
        _id: log._id,
      });
      IoHelper.deleteFileSync(`${process.cwd()}/${this.configuration.path}/${log.file}`);
    } else {
      CodegenHelper.logSuccess(logCollection.collectionName, `No migrations to ${this.remove.name}`);
    }
    await client.close();
    process.exit(0);
  }

  private async up(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.up.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const logCollection = db.collection<MigrationLogInterface>(this.configuration.collection);
    const logList = await logCollection
      .find(
        {
          status: { $in: ['pending', 'revoked'] },
        },
        { sort: { _id: -1 } },
      )
      .toArray();
    if (logList.length) {
      for (const log of logList) {
        await logCollection.updateOne(
          { _id: log._id },
          {
            $set: {
              appliedAt: new Date(),
              status: 'applied',
            },
          },
        );
        await this.executeMigrationUp(db, log);
      }
    } else {
      CodegenHelper.logSuccess(logCollection.collectionName, `No migrations to ${this.up.name}`);
    }
    process.exit(0);
  }

  private async reset(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.reset.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const logCollection = db.collection<MigrationLogInterface>(this.configuration.collection);
    const logList = await logCollection
      .find(
        {
          status: 'applied',
        },
        { sort: { _id: -1 } },
      )
      .toArray();
    if (logList.length) {
      for (const log of logList) {
        await logCollection.updateOne(
          { _id: log._id },
          {
            $set: {
              revokedAt: new Date(),
              status: 'revoked',
            },
          },
        );
        await this.executeMigrationDown(db, log);
      }
    } else {
      CodegenHelper.logSuccess(logCollection.collectionName, `No migrations to ${this.reset.name}`);
    }
    process.exit(0);
  }

  private async down(): Promise<void> {
    CodegenHelper.displayMessage('migration', this.down.name);
    const client = await this.getMongoClient();
    const db = client.db(this.configuration.database);
    const logCollection = db.collection<MigrationLogInterface>(this.configuration.collection);
    const log = await logCollection.findOne(
      {
        status: 'applied',
      },
      { sort: { _id: -1 } },
    );
    if (log) {
      await logCollection.updateOne(
        { _id: log._id },
        {
          $set: {
            revokedAt: new Date(),
            status: 'revoked',
          },
        },
      );
      await this.executeMigrationDown(db, log);
    } else {
      CodegenHelper.logSuccess(logCollection.collectionName, `No migrations to ${this.down.name}`);
    }
    process.exit(0);
  }

  private async executeMigrationUp(db: Db, log: MigrationLogInterface): Promise<void> {
    try {
      const migration = await this.getMigration(log.file);
      await migration.up(db);
      CodegenHelper.logSuccess(log.file, log.class);
    } catch (e) {
      CodegenHelper.logError(log.file, e as Error);
      process.exit(1);
    }
  }

  private async executeMigrationDown(db: Db, log: MigrationLogInterface): Promise<void> {
    try {
      const migration = await this.getMigration(log.file);
      await migration.down(db);
      CodegenHelper.logSuccess(log.file, log.class);
    } catch (e) {
      CodegenHelper.logError(log.file, e as Error);
      process.exit(1);
    }
  }
}

export const MigrateMongoHelper = MigrationMongoClass.getInstance();
