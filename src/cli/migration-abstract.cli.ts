import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CodegenHelper } from '../helpers/codegen.helper';
import { ConverterHelper } from '../helpers/converter.helper';
import { DataHelper } from '../helpers/data.helper';
import { IoHelper } from '../helpers/io.helper';

export interface MigrationAbstractConfiguration {
  pathMigration: string;
  pathSeeder: string;
  uri: string;
  database: string;
  template?: string;
}

export type CommandBuilderYargs = {
  positional: (key: string, options: yargs.Options) => void;
};

export interface CommandInterface {
  name: string;
  desc: string;
  builder?: (yargs: CommandBuilderYargs) => void;
  handler: (argv: yargs.ArgumentsCamelCase<Record<string, unknown>>) => void;
}

export abstract class MigrationAbstractCli<Configuration extends MigrationAbstractConfiguration> {
  protected abstract readonly commandList: CommandInterface[];

  protected configuration!: Configuration;

  protected abstract check(): Promise<void>;

  protected abstract getTemplate(timestamp: number, migrationName: string): string;

  public async migrate(configuration: Configuration): Promise<void> {
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
        yargsInstance.showHelp();
        process.exit(1);
      })
      .wrap(100)
      .help().argv;
  }

  protected create(migration: string): Promise<void> {
    CodegenHelper.displayMessage('migration', this.create.name);
    const timestamp = new Date().getTime();
    const migrationName = ConverterHelper.tokenizeWords(migration.replace(/[^a-zA-Z0-9]/g, '-'), '-').toLowerCase();
    const fileName = `${timestamp}_${migrationName}`;
    const filePath = `${this.configuration.pathMigration}/${fileName}${this.getMigrationExtension()}`;
    IoHelper.createFileSync(filePath, this.getTemplate(timestamp, migrationName));
    CodegenHelper.logSuccess(`${fileName}`, DataHelper.excludePath(filePath, this.configuration.pathMigration));
    process.exit(0);
  }

  protected getMigrationExtension(): '.ts' | '.js' {
    return this.isTypeScriptExecution() ? '.ts' : '.js';
  }

  protected getMigrationFileFilter(): RegExp[] {
    return [this.getMigrationExtension() === '.ts' ? /\.ts$/ : /\.js$/];
  }

  protected normalizeMigrationFileName(fileName: string): string {
    return fileName.replace(/\.(ts|js)$/, '');
  }

  protected scanMigrationFiles(): string[] {
    return IoHelper.scanFilesSync(this.configuration.pathMigration, { filter: this.getMigrationFileFilter() }).map(
      (filePath) => DataHelper.excludePath(filePath, this.configuration.pathMigration),
    );
  }

  protected getMigrationFileName(fileName: string): string {
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
