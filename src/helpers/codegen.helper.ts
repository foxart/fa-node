import { exec } from 'child_process';
import fs from 'fs';
import { buildClientSchema, IntrospectionQuery, printSchema } from 'graphql';
import path from 'path';
import { promisify } from 'util';
import { LoggerClass } from '../classes/logger.class';

type JsonType = string | number | boolean | null | { [key: string]: JsonType } | JsonType[];

class CodegenSingleton {
  private static self: CodegenSingleton;

  private readonly logger: LoggerClass;

  private constructor() {
    this.logger = new LoggerClass({
      color: true,
    });
  }

  public static getInstance(): CodegenSingleton {
    if (!CodegenSingleton.self) {
      CodegenSingleton.self = new CodegenSingleton();
    }
    return CodegenSingleton.self;
  }

  public displayMessage(name: string, message: string): void {
    const result = [
      this.applyColor(` ${name.toUpperCase()} `, [this.logger.background.cyan]),
      this.applyColor(` ${message}`, [this.logger.foreground.cyan]),
    ];
    console.log(result.join(''));
  }

  public logSuccess(context: string, message: string): void {
    const result = [
      this.applyColor(context, [this.logger.foreground.white]),
      this.applyColor(` ${this.logger.status.success} `, [this.logger.effect.bold, this.logger.foreground.green]),
      this.applyColor(message, [this.logger.effect.dim, this.logger.foreground.green]),
    ];
    console.log(result.join(''));
  }

  public logWarning(context: string, message: string): void {
    const result = [
      this.applyColor(context, [this.logger.foreground.white]),
      this.applyColor(` ${this.logger.status.warning} `, [this.logger.effect.bold, this.logger.foreground.yellow]),
      this.applyColor(message, [this.logger.effect.dim, this.logger.foreground.yellow]),
    ];
    console.log(result.join(''));
  }

  public logError(context: string, err: Error): void {
    const result = [
      this.applyColor(context, [this.logger.foreground.white]),
      this.applyColor(` ${this.logger.status.error} `, [this.logger.effect.bold, this.logger.foreground.red]),
      this.applyColor(err.message, [this.logger.effect.dim, this.logger.foreground.red]),
    ];
    console.log(result.join(''));
  }

  public async fetchJson(host: string, init: RequestInit): Promise<JsonType | null> {
    try {
      const response = await fetch(host, init);
      if (!response.ok) {
        this.logError(this.fetchJson.name, new Error(response.statusText));
        return null;
      }
      const json = (await response.json()) as JsonType;
      this.logSuccess(this.fetchJson.name, host);
      return json;
    } catch (e) {
      this.logError(this.fetchJson.name, e as Error);
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
      this.logError(this.fetchTxt.name, e as Error);
      return null;
    }
  }

  public buildGraphql(filePath: string, introspectionQuery: IntrospectionQuery): void {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, printSchema(buildClientSchema(introspectionQuery)));
      this.logSuccess(this.buildGraphql.name, path.basename(filePath));
    } catch (e) {
      this.logError(this.buildGraphql.name, e as Error);
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
      // await executor(command.join(' '));
      await promisify(exec)(command.join(' '));
      this.logSuccess(this.buildProto.name, path.basename(filePath));
    } catch (e) {
      this.logError(this.buildProto.name, e as Error);
    }
  }

  private applyColor(data: string, colorList: string[]): string {
    if (!colorList.length) {
      return data;
    }
    return colorList.join('') + data + this.logger.effect.reset;
  }
}

export const CodegenHelper = CodegenSingleton.getInstance();
