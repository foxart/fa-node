import { exec } from 'child_process';
import { buildClientSchema, IntrospectionQuery, printSchema } from 'graphql';
import path from 'path';
import { promisify } from 'util';
import { ColorHelper } from './color.helper';
import { IoHelper } from './io.helper';
import { SymbolHelper } from './symbol.helper';

const { foreground, background, effect } = ColorHelper;

class CodegenSingleton {
  private static self: CodegenSingleton;

  public static getInstance(): CodegenSingleton {
    if (!CodegenSingleton.self) {
      CodegenSingleton.self = new CodegenSingleton();
    }
    return CodegenSingleton.self;
  }

  public displayMessage(name: string, message: string): void {
    const result = [
      ColorHelper.wrapData(` ${name.toUpperCase()} `, background.CYAN),
      ColorHelper.wrapData(` ${message}`, foreground.CYAN),
    ];
    console.log(result.join(''));
  }

  public logSuccess(context: string, message: string): void {
    const result = [
      ColorHelper.wrapData(context, foreground.WHITE),
      ColorHelper.wrapData(` ${SymbolHelper.status.SUCCESS} `, [effect.BOLD, foreground.GREEN]),
      ColorHelper.wrapData(message, [effect.DIM, foreground.GREEN]),
    ];
    console.log(result.join(''));
  }

  public logWarning(context: string, message: string): void {
    const result = [
      ColorHelper.wrapData(context, foreground.WHITE),
      ColorHelper.wrapData(` ${SymbolHelper.status.WARNING} `, [effect.BOLD, foreground.YELLOW]),
      ColorHelper.wrapData(message, [effect.DIM, foreground.YELLOW]),
    ];
    console.log(result.join(''));
  }

  public logError(context: string, err: Error): void {
    const result = [
      ColorHelper.wrapData(context, foreground.WHITE),
      ColorHelper.wrapData(` ${SymbolHelper.status.ERROR} `, [effect.BOLD, foreground.RED]),
      ColorHelper.wrapData(err.message, [effect.DIM, foreground.RED]),
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
      IoHelper.createFileSync(filePath, printSchema(buildClientSchema(introspectionQuery)));
      this.logSuccess(this.buildGraphql.name, path.basename(filePath));
    } catch (e) {
      this.logError(this.buildGraphql.name, e as Error);
    }
  }

  public async buildProto(source: string, destination: string, filePath: string): Promise<void> {
    try {
      IoHelper.createDirectorySync(destination);
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
}

export const CodegenHelper = CodegenSingleton.getInstance();
