import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import { basename, resolve } from 'path';

interface ProtoGeneratorOptions {
  env?: 'browser' | 'both' | 'node';
  esModuleInterop?: boolean;
  forceLong?: 'bigint' | 'long' | 'number' | 'string';
  lowerCaseServiceMethods?: boolean;
  oneof?: 'properties' | 'unions' | 'unions-value';
  onlyTypes?: boolean;
  outputJsonMethods?: boolean | 'from-only' | 'to-only';
  outputPartialMethods?: boolean;
  outputServices?: 'default' | 'generic-definitions' | 'grpc-js' | 'nice-grpc' | 'none';
  snakeToCamel?: boolean;
  unrecognizedEnum?: boolean;
  useOptionals?: 'all' | 'messages' | 'none';
}

const PROTO_GENERATOR_OPTIONS: ProtoGeneratorOptions = {
  forceLong: 'number',
  onlyTypes: true,
  snakeToCamel: false,
  unrecognizedEnum: false,
  useOptionals: 'all',
};

const PROTOC_FILE = resolve('node_modules/protoc/protoc.cjs');
const PROTO_PLUGIN_FILE = resolve('node_modules/ts-proto/protoc-gen-ts_proto');
const execFileAsync = promisify(execFile);
// 🎨 ANSI color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  fg: {
    white: '\x1b[37m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
  },
  bg: {
    cyan: '\x1b[46m',
  },
} as const;

// 🚦 Status icons for log levels
const STATUS = {
  success: '✔', // success
  warning: '⚠', // warning
  error: '✖', // error
} as const;

class CodegenHelperClass {
  public displayMessage(name: string, message: string): void {
    const result = [
      this.applyColor(` ${name.toUpperCase()} `, [COLORS.bg.cyan]),
      this.applyColor(` ${message}`, [COLORS.fg.cyan]),
    ];
    console.log(result.join(''));
  }

  public logSuccess(context: string, message: string): void {
    console.log(this.buildLogLine(context, STATUS.success, message, COLORS.fg.green));
  }

  public logWarning(context: string, message: string): void {
    console.log(this.buildLogLine(context, STATUS.warning, message, COLORS.fg.yellow));
  }

  public logError(context: string, err: unknown): void {
    const message = this.formatError(err);
    console.log(this.buildLogLine(context, STATUS.error, message, COLORS.fg.red));
  }

  public async fetchJson<T>(host: string, init: RequestInit): Promise<T | null> {
    const response = await this.fetchResponse(this.fetchJson.name, host, init);
    if (!response) {
      return null;
    }

    const json = (await response.json()) as T;
    this.logSuccess(this.fetchJson.name, host);
    return json;
  }

  public async fetchTxt(host: string, init: RequestInit): Promise<string | null> {
    const response = await this.fetchResponse(this.fetchTxt.name, host, init);
    if (!response) {
      return null;
    }

    const text = await response.text();
    this.logSuccess(this.fetchTxt.name, host);
    return text;
  }

  public buildGraphql<T>(destinationFile: string, introspectionQuery: T, transformer: (input: T) => string): void {
    try {
      fs.mkdirSync(dirname(destinationFile), { recursive: true });
      fs.writeFileSync(destinationFile, transformer(introspectionQuery));
      this.logSuccess(this.buildGraphql.name, basename(destinationFile));
    } catch (e) {
      this.logError(this.buildGraphql.name, e);
    }
  }

  public async buildProto(
    sourceFile: string,
    destinationFolder: string,
    generatorOptions: ProtoGeneratorOptions = PROTO_GENERATOR_OPTIONS,
  ): Promise<void | null> {
    try {
      fs.mkdirSync(destinationFolder, { recursive: true });
      const options = Object.entries(generatorOptions)
        .filter((entry): entry is [string, boolean | string] => entry[1] !== undefined)
        .map(([name, value]) => `${name}=${String(value)}`)
        .join(',');
      await execFileAsync(process.execPath, [
        PROTOC_FILE,
        '--experimental_editions',
        `--plugin=protoc-gen-ts_proto=${PROTO_PLUGIN_FILE}`,
        `--proto_path=${dirname(sourceFile)}`,
        `--ts_proto_out=${destinationFolder}`,
        `--ts_proto_opt=${options}`,
        basename(sourceFile),
      ]);
      this.logSuccess(this.buildProto.name, basename(sourceFile));
    } catch (error) {
      this.logError(this.buildProto.name, error);
      return null;
    }
  }

  private async fetchResponse(context: string, host: string, init: RequestInit): Promise<Response | null> {
    try {
      const response = await fetch(host, init);
      if (!response.ok) {
        this.logError(context, this.createHttpError(host, init, response));
        return null;
      }
      return response;
    } catch (error) {
      this.logError(context, error);
      return null;
    }
  }

  private createHttpError(host: string, init: RequestInit, response: Response): Error {
    return Object.assign(new Error(response.statusText || 'Request failed'), {
      name: 'HttpError',
      status: response.status,
      statusCode: response.status,
      url: host,
      method: init.method ?? 'GET',
    });
  }

  private buildLogLine(context: string, status: string, message: string, color: string): string {
    return [
      this.applyColor(context, [COLORS.fg.white]),
      this.applyColor(` ${status} `, [COLORS.bold, color]),
      this.applyColor(message, [COLORS.dim, color]),
    ].join('');
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      const source = error as Error &
        Record<string, unknown> & {
          code?: string | number;
          cmd?: string;
          stderr?: string;
          stdout?: string;
          status?: string | number;
          method?: string;
          url?: string;
        };
      const entries: Array<[string, unknown]> = [
        ['name', source.name],
        ['message', source.message],
        ['code', source.code],
        ['cmd', source.cmd],
        ['stdout', source.stdout],
        ['stderr', source.stderr],
        ['status', source.status],
        ['method', source.method],
        ['url', source.url],
      ];
      const includedPropertySet = new Set(entries.map(([property]) => property));
      for (const property of Object.getOwnPropertyNames(source)) {
        const value = source[property];
        const nestedErrorList = value instanceof Error ? [value] : Array.isArray(value) ? value : [];
        if (
          property !== 'stack' &&
          !includedPropertySet.has(property) &&
          nestedErrorList.some(
            (nestedError) =>
              nestedError instanceof Error && (!nestedError.message || !source.message.includes(nestedError.message)),
          )
        ) {
          entries.push([property, value]);
        }
      }

      return entries
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([label, value]) => {
          if (value instanceof Error) {
            return `${label}: ${this.formatError(value)}`;
          }
          if (Array.isArray(value)) {
            return `${label}: ${value
              .map((item, index) => `[${index}] ${item instanceof Error ? this.formatError(item) : String(item)}`)
              .join('\n')}`;
          }
          if (typeof value === 'string') {
            return `${label}: ${value}`;
          }
          try {
            return `${label}: ${JSON.stringify(value)}`;
          } catch {
            return `${label}: ${String(value)}`;
          }
        })
        .join('\n');
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private applyColor(data: string, colorList: string[]): string {
    if (!colorList.length) {
      return data;
    }
    return colorList.join('') + data + COLORS.reset;
  }
}

export const CodegenHelper = new CodegenHelperClass();
