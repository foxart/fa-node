import fs, { ObjectEncodingOptions, WriteFileOptions } from 'fs';
import path from 'path';

class IoHelperClass {
  public checkPath(path: string): boolean {
    return fs.existsSync(path);
  }

  public scanDirectoriesSync(
    directory: string,
    options: { recursive?: boolean; filter?: RegExp[] } = { recursive: false },
  ): string[] {
    const result: string[] = [];
    if (!fs.existsSync(directory)) {
      return result;
    }
    const entries = fs.readdirSync(directory);
    for (const entry of entries) {
      const fullPath = path.join(directory, entry);
      if (fs.statSync(fullPath).isDirectory() && options.recursive) {
        result.push(...this.scanDirectoriesSync(fullPath, options));
      } else if (!options.filter || options.filter.some((item) => item.test(fullPath))) {
        result.push(fullPath);
      }
    }
    return result;
  }

  public createDirectorySync(directory: string, recursive = false): void {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive });
    }
  }

  public deleteDirectorySync(
    directory: string,
    options: { recursive?: boolean; onlyEmpty?: boolean } = { recursive: false },
  ): void {
    if (options.onlyEmpty) {
      fs.readdirSync(directory).forEach((file) => {
        const fullPath = path.join(directory, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
          this.deleteDirectorySync(fullPath, options);
        }
      });
      if (fs.readdirSync(directory).length === 0) {
        fs.rmdirSync(directory);
      }
    } else if (fs.statSync(directory).isDirectory()) {
      fs.rmSync(directory, { recursive: options.recursive, force: true });
    }
  }

  public scanFilesSync(
    directory: string,
    options: { recursive?: boolean; filter?: RegExp[] } = { recursive: false },
  ): string[] {
    if (!fs.existsSync(directory)) {
      return [];
    }
    const result: string[] = [];
    const entries = fs.readdirSync(directory);
    for (const entry of entries) {
      const fullPath = path.join(directory, entry);
      if (fs.statSync(fullPath).isDirectory() && options.recursive) {
        result.push(...this.scanFilesSync(fullPath, options));
      } else if (!options.filter || options.filter.some((item) => item.test(fullPath))) {
        result.push(fullPath);
      }
    }
    return result;
  }

  public createFileSync(
    filePath: string,
    content: string | NodeJS.ArrayBufferView,
    options: WriteFileOptions = { encoding: 'utf-8' },
  ): void {
    this.createDirectorySync(path.dirname(filePath));
    fs.writeFileSync(filePath, content, options);
  }

  public readFileSync(
    filePath: string,
    options?: (ObjectEncodingOptions & { flag?: string | undefined }) | BufferEncoding,
  ): string | Buffer {
    // return fs.readFileSync(filePath, options || { encoding: 'utf8' });
    return fs.readFileSync(filePath, options);
  }

  public deleteFileSync(filePath: string): void {
    if (fs.lstatSync(filePath).isFile()) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

export const IoHelper = new IoHelperClass();
