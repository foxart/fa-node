import fs, { ObjectEncodingOptions, WriteFileOptions } from 'fs';
import path from 'path';

class IoSingleton {
  private static self: IoSingleton;

  public static getInstance(): IoSingleton {
    if (!IoSingleton.self) {
      IoSingleton.self = new IoSingleton();
    }
    return IoSingleton.self;
  }

  public relativePath(basePath: string, targetPath: string): string {
    if (targetPath.startsWith(basePath)) {
      const cleanedPath = targetPath.replace(basePath, '').replace(/^\/|\/$/g, '');
      return cleanedPath || '.'; // Return '.' if the cleaned path is empty
    }
    return targetPath.replace(/^\/|\/$/g, '');
  }

  public checkPath(path: string): boolean {
    return fs.existsSync(path);
  }

  public scanDirectoriesSync(directory: string, filter?: RegExp[]): string[] {
    const result: string[] = [];
    if (!fs.existsSync(directory)) {
      return result;
    }
    const entries = fs.readdirSync(directory);
    for (const entry of entries) {
      const fullPath = path.join(directory, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!filter || filter?.some((item) => item.test(fullPath))) {
          result.push(fullPath);
        }
        result.push(...this.scanDirectoriesSync(fullPath, filter));
      }
    }
    return result;
  }

  public createDirectorySync(directory: string): void {
    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
    } catch (e) {
      console.error(e);
    }
  }

  public deleteDirectorySync(directory: string, onlyEmpty?: boolean): void {
    try {
      if (onlyEmpty) {
        fs.readdirSync(directory).forEach((file) => {
          const fullPath = path.join(directory, file);
          if (fs.lstatSync(fullPath).isDirectory()) {
            this.deleteDirectorySync(fullPath, onlyEmpty);
          }
        });
        if (fs.readdirSync(directory).length === 0) {
          fs.rmdirSync(directory);
        }
      } else if (fs.statSync(directory).isDirectory()) {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    } catch (e) {
      console.error(e);
    }
  }

  public scanFilesSync(directory: string, filter?: RegExp[]): string[] {
    if (!fs.existsSync(directory)) {
      return [];
    }
    const result: string[] = [];
    const entries = fs.readdirSync(directory);
    for (const entry of entries) {
      const fullPath = path.join(directory, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        result.push(...this.scanFilesSync(fullPath, filter));
      } else if (
        !filter ||
        filter?.some((item) => {
          return item.test(fullPath);
        })
      ) {
        result.push(fullPath);
      }
    }
    return result;
  }

  public createFileSync(filePath: string, content: string | NodeJS.ArrayBufferView, options?: WriteFileOptions): void {
    try {
      this.createDirectorySync(path.dirname(filePath));
      // fs.writeFileSync(filePath, content, options || { encoding: 'utf-8' });
      fs.writeFileSync(filePath, content, options);
    } catch (e) {
      console.error(e);
    }
  }

  public deleteFileSync(filePath: string): void {
    try {
      if (fs.lstatSync(filePath).isFile()) {
        fs.rmSync(filePath, { force: true });
      }
    } catch (e) {
      console.error(e);
    }
  }

  public readFileSync(
    filePath: string,
    options?: (ObjectEncodingOptions & { flag?: string | undefined }) | BufferEncoding,
  ): string | Buffer {
    try {
      // return fs.readFileSync(filePath, options || { encoding: 'utf8' });
      return fs.readFileSync(filePath, options);
    } catch (e) {
      console.error(e);
    }
    return '';
  }
}

export const IoHelper = IoSingleton.getInstance();
