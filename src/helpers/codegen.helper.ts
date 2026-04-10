import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

class CodegenSingleton {
  private static self: CodegenSingleton;

  private colors = {
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
  };

  private status = {
    success: '✔',
    warning: '⚠',
    error: '✖',
  };

  private constructor() {}

  public static getInstance(): CodegenSingleton {
    if (!CodegenSingleton.self) {
      CodegenSingleton.self = new CodegenSingleton();
    }
    return CodegenSingleton.self;
  }

  public displayMessage(name: string, message: string): void {
    const result = [
      this.applyColor(` ${name.toUpperCase()} `, [this.colors.bg.cyan]),
      this.applyColor(` ${message}`, [this.colors.fg.cyan]),
    ];
    console.log(result.join(''));
  }

  public logSuccess(context: string, message: string): void {
    const result = [
      this.applyColor(context, [this.colors.fg.white]),
      this.applyColor(` ${this.status.success} `, [this.colors.bold, this.colors.fg.green]),
      this.applyColor(message, [this.colors.dim, this.colors.fg.green]),
    ];
    console.log(result.join(''));
  }

  public logWarning(context: string, message: string): void {
    const result = [
      this.applyColor(context, [this.colors.fg.white]),
      this.applyColor(` ${this.status.warning} `, [this.colors.bold, this.colors.fg.yellow]),
      this.applyColor(message, [this.colors.dim, this.colors.fg.yellow]),
    ];
    console.log(result.join(''));
  }

  public logError(context: string, err: unknown): void {
    const message = this.formatError(err);
    const result = [
      this.applyColor(context, [this.colors.fg.white]),
      this.applyColor(` ${this.status.error} `, [this.colors.bold, this.colors.fg.red]),
      this.applyColor(message, [this.colors.dim, this.colors.fg.red]),
    ];
    console.log(result.join(''));
  }

  public async fetchJson<T>(host: string, init: RequestInit): Promise<T | null> {
    try {
      const response = await fetch(host, init);
      if (!response.ok) {
        this.logError(this.fetchJson.name, new Error(response.statusText));
        return null;
      }
      const json = (await response.json()) as T;
      this.logSuccess(this.fetchJson.name, host);
      return json;
    } catch (e) {
      this.logError(this.fetchJson.name, e);
      return null;
    }
  }

  public async fetchTxt(host: string, init: RequestInit): Promise<string | null> {
    try {
      const response = await fetch(host, init);
      if (!response.ok) {
        this.logError(this.fetchTxt.name, new Error(response.statusText));
        return null;
      }
      const text = await response.text();
      this.logSuccess(this.fetchTxt.name, host);
      return text;
    } catch (e) {
      this.logError(this.fetchTxt.name, e);
      return null;
    }
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

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      const details = [error.name, error.message].filter(Boolean).join(': ');
      return error.stack ? `${details}\n${error.stack}` : details;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  }

  private applyColor(data: string, colorList: string[]): string {
    if (!colorList.length) {
      return data;
    }
    return colorList.join('') + data + this.colors.reset;
  }
}

export const CodegenHelper = CodegenSingleton.getInstance();
