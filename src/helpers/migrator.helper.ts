import fs from 'node:fs';
import path from 'node:path';
import process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { CodegenHelper } from './codegen.helper';
import { ConverterHelper } from './converter.helper';
import { IoHelper } from './io.helper';

interface ArgvInterface {
  $0: string;
  _: (string | number)[];
  // [key: string]: string;
}

function createMigration(migrationPath: string, migrationName: string, migrationTemplate: string): void {
  const timestamp = new Date().getTime();
  const migrationFileName = `${timestamp}_${migrationName}.ts`;
  try {
    const migrationsDir = path.join(process.cwd(), migrationPath);
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    const migrationFilePath = path.join(migrationsDir, migrationFileName);
    let templateContent = fs.readFileSync(migrationTemplate, 'utf8');
    templateContent = templateContent.replace(
      /MigrationTemplate/g,
      `${ConverterHelper.separatorToCamel(migrationName, '-')}_${timestamp}`,
    );
    IoHelper.createFileSync(migrationFilePath, templateContent);
    CodegenHelper.logSuccess(migrationName, 'created');
  } catch (e) {
    CodegenHelper.logError(migrationName, e as Error);
    process.exit(1);
  }
}

/**
 *
 */
class MigratorClass {
  private static self: MigratorClass;

  private readonly argv;

  private constructor() {
    // this.argv = yargs(hideBin(process.argv))
    //   .command('new <name>', 'Create a new migration', (yargs) => {
    //     return yargs
    //       .positional('name', {
    //         describe: 'Migration name',
    //         type: 'string',
    //       })
    //       .option('template', {
    //         alias: 't',
    //         type: 'string',
    //         description: 'Migration template path',
    //         default: './mongo-migrate-template.ts',
    //       });
    //   })
    //   .help().argv as unknown as ArgvInterface;
    const commands = [
      {
        name: 'new <name>',
        desc: 'Create a new migration',
        // builder: (yargs: { positional: (arg0: string, arg1: { describe: string; type: string }) => void }): void =>
        builder: (yargs: { positional: (arg0: string, arg1: { describe: string; type: string }) => void }): void => {
          // if (yargs) {
          //   console.log(`Creating migration`);
          //   yargs.positional('name', {
          //     describe: 'Migration name',
          //     type: 'string',
          //   });
          // }
        },
        handler: (argv: { name: string }): void => {
          console.log(`Creating migration: ${argv.name}`);
        },
      },
      {
        name: 'list',
        desc: 'List all migrations',
        builder: (): void => {
          //
        },
        handler: (): void => {
          console.log('Listing migrations...');
        },
      },
    ];
    this.argv = commands
      .reduce(
        (yargsInstance, command) => {
          // @ts-ignore
          return yargsInstance.command(command.name, command.desc, command.builder, command.handler);
        },
        yargs(hideBin(process.argv)),
      )
      .help().argv;
  }

  public static getInstance(): MigratorClass {
    if (!MigratorClass.self) {
      MigratorClass.self = new MigratorClass();
    }
    return MigratorClass.self;
  }

  public create(): void {
    console.log(this.argv);
  }
}

export const MigratorHelper = MigratorClass.getInstance();
