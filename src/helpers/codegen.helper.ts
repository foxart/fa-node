import { exec } from 'child_process';
import { buildClientSchema, printSchema } from 'graphql/utilities';
import type { IntrospectionQuery } from 'graphql/utilities/getIntrospectionQuery';
import path from 'path';
import { promisify } from 'util';
import { ColorHelper } from './color.helper';
import { IoHelper } from './io.helper';
import { SymbolHelper } from './symbol.helper';

// const executor = promisify(exec);
class CodegenSingleton {
  private static self: CodegenSingleton;

  public static getInstance(): CodegenSingleton {
    if (!CodegenSingleton.self) {
      CodegenSingleton.self = new CodegenSingleton();
    }
    return CodegenSingleton.self;
  }

  public message(name: string, msg: string): void {
    const result = [ColorHelper.wrapData(` ${name.toUpperCase()} `, ColorHelper.background.CYAN)];
    if (msg) {
      result.push(ColorHelper.wrapData(` ${msg}`, ColorHelper.foreground.CYAN), ' ');
    }
    console.log(result.join(''));
  }

  public success(name: string, msg: string): void {
    const result = [
      ColorHelper.wrapData(name, ColorHelper.foreground.WHITE),
      ' ',
      ColorHelper.wrapData(SymbolHelper.status.SUCCESS, [ColorHelper.effect.BOLD, ColorHelper.foreground.GREEN]),
      ' ',
      ColorHelper.wrapData(msg, [ColorHelper.effect.DIM, ColorHelper.foreground.GREEN]),
    ];
    console.log(result.join(''));
  }

  public error(name: string, msg: string, err: Error): void {
    const result = [
      ColorHelper.wrapData(name, ColorHelper.foreground.WHITE),
      ' ',
      ColorHelper.wrapData(SymbolHelper.status.ERROR, [ColorHelper.effect.BOLD, ColorHelper.foreground.RED]),
      ' ',
      ColorHelper.wrapData(msg, [ColorHelper.effect.DIM, ColorHelper.foreground.RED]),
    ];
    if (err) {
      result.push(' ', ColorHelper.wrapData(err.message ?? err.name, ColorHelper.foreground.RED));
    }
    console.log(result.join(''));
  }

  public async fetchJson(host: string, init: RequestInit): Promise<unknown | null> {
    try {
      const response = await fetch(host, init);
      if (!response.ok) {
        this.error(this.fetchJson.name, host, new Error(response.statusText));
        return null;
      }
      const json = (await response.json()) as unknown;
      this.success(this.fetchJson.name, host);
      return json;
    } catch (e) {
      this.error(this.fetchJson.name, host, e as Error);
      return null;
    }
  }

  public async fetchTxt(host: string, init: RequestInit): Promise<string | null> {
    try {
      const response = await fetch(host, init);
      if (!response.ok) {
        this.error(this.fetchTxt.name, host, new Error(response.statusText));
        return null;
      }
      const text = await response.text();
      this.success(this.fetchTxt.name, host);
      return text;
    } catch (e) {
      this.error(this.fetchTxt.name, host, e as Error);
      return null;
    }
  }

  public buildGraphql(filePath: string, introspectionQuery: IntrospectionQuery): void {
    try {
      IoHelper.createFileSync(filePath, printSchema(buildClientSchema(introspectionQuery)));
      this.success(this.buildGraphql.name, path.basename(filePath));
    } catch (e) {
      this.error(this.buildGraphql.name, path.basename(filePath), e as Error);
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
      this.success(this.buildProto.name, path.basename(filePath));
    } catch (e) {
      this.error(this.buildProto.name, path.basename(filePath), e as Error);
    }
  }
}

export const CodegenHelper = CodegenSingleton.getInstance();
