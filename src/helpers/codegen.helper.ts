import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
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

class CodegenSingleton {
  private static self: CodegenSingleton;

  private constructor() {}

  public static getInstance(): CodegenSingleton {
    if (!CodegenSingleton.self) {
      CodegenSingleton.self = new CodegenSingleton();
    }
    return CodegenSingleton.self;
  }

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

  public buildGraphql<T>(filePath: string, introspectionQuery: T, transformer: (input: T) => string): void {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, transformer(introspectionQuery));
      this.logSuccess(this.buildGraphql.name, path.basename(filePath));
    } catch (e) {
      this.logError(this.buildGraphql.name, e);
    }
  }

  public async buildProto(source: string, destination: string, filePath: string): Promise<void> {
    try {
      fs.mkdirSync(destination, { recursive: true });
      const command = [
        'protoc',
        `--proto_path=${source}`,
        `--js_out=import_style=commonjs,binary:${destination}`,
        // `--csharp_out=${destination}`,
        `--ts_out=${destination}`,
        filePath,
      ];
      await promisify(exec)(command.join(' '));
      this.logSuccess(this.buildProto.name, path.basename(filePath));
    } catch (e) {
      const error = e as Error & { stdout?: string; stderr?: string; cmd?: string };
      const details = [
        error.cmd ? `Command: ${error.cmd}` : '',
        error.stdout ? `STDOUT:\n${error.stdout}` : '',
        error.stderr ? `STDERR:\n${error.stderr}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');
      this.logError(this.buildProto.name, details ? new Error(`${error.message}\n\n${details}`) : error);
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
      const source = error as Error & {
        code?: string | number;
        status?: string | number;
        statusCode?: string | number;
        url?: string;
        uri?: string;
        path?: string;
        host?: string;
        method?: string;
        details?: unknown;
        cause?: unknown;
        response?: unknown;
      };

      const entries: Array<[string, unknown]> = [
        ['name', source.name],
        ['message', source.message],
        ['code', source.code],
        ['status', source.status],
        ['statusCode', source.statusCode],
        ['method', source.method],
        ['url', source.url],
        ['uri', source.uri],
        ['path', source.path],
        ['host', source.host],
        ['details', source.details],
        ['cause', source.cause],
        ['response', source.response],
      ];

      return entries
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([label, value]) => `${label}: ${this.stringifyErrorValue(value)}`)
        .join('\n');
    }

    return this.stringifyErrorValue(error);
  }

  private stringifyErrorValue(value: unknown): string {
    if (value instanceof Error) {
      return this.formatError(value);
    }

    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private applyColor(data: string, colorList: string[]): string {
    if (!colorList.length) {
      return data;
    }
    return colorList.join('') + data + COLORS.reset;
  }
}

export const CodegenHelper = CodegenSingleton.getInstance();
