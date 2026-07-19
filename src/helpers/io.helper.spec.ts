import * as fs from 'fs';
import os from 'node:os';
import * as path from 'path';

import { IoHelper } from './io.helper';

describe('IoHelper', () => {
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fa-node-io-'));
  });

  afterEach(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('should create, read, scan, and delete files', () => {
    const nested = path.join(temporaryDirectory, 'nested');
    const textFile = path.join(nested, 'value.txt');
    const jsonFile = path.join(temporaryDirectory, 'value.json');

    expect(IoHelper.checkPath(textFile)).toBe(false);
    IoHelper.createDirectorySync(nested, true);
    IoHelper.createDirectorySync(nested, true);
    IoHelper.createFileSync(textFile, 'content');
    IoHelper.createFileSync(jsonFile, '{}');

    expect(IoHelper.checkPath(textFile)).toBe(true);
    expect(IoHelper.readFileSync(textFile, 'utf8')).toBe('content');
    expect(IoHelper.scanFilesSync(path.join(temporaryDirectory, 'missing'))).toStrictEqual([]);
    expect(IoHelper.scanFilesSync(temporaryDirectory, { recursive: true, filter: [/\.txt$/] })).toStrictEqual([
      textFile,
    ]);
    expect(IoHelper.scanFilesSync(temporaryDirectory)).toContain(nested);
    expect(IoHelper.scanDirectoriesSync(path.join(temporaryDirectory, 'missing'))).toStrictEqual([]);
    expect(IoHelper.scanDirectoriesSync(temporaryDirectory, { recursive: true, filter: [/\.json$/] })).toStrictEqual([
      jsonFile,
    ]);
    expect(IoHelper.scanDirectoriesSync(temporaryDirectory)).toContain(nested);

    IoHelper.deleteFileSync(textFile);
    expect(IoHelper.checkPath(textFile)).toBe(false);
    IoHelper.deleteDirectorySync(nested, { onlyEmpty: true });
    expect(IoHelper.checkPath(nested)).toBe(false);
    const defaultDelete = path.join(temporaryDirectory, 'default-delete');
    IoHelper.createDirectorySync(defaultDelete);
    expect(() => IoHelper.deleteDirectorySync(defaultDelete)).toThrow();
    IoHelper.deleteDirectorySync(temporaryDirectory, { recursive: true });
    expect(IoHelper.checkPath(temporaryDirectory)).toBe(false);
  });

  it('should retain non-empty directories when deleting only empty trees', () => {
    const parent = path.join(temporaryDirectory, 'parent');
    const empty = path.join(parent, 'empty');
    const occupied = path.join(parent, 'occupied');
    IoHelper.createDirectorySync(empty, true);
    IoHelper.createFileSync(path.join(occupied, 'value.txt'), 'value');

    IoHelper.deleteDirectorySync(parent, { onlyEmpty: true });

    expect(IoHelper.checkPath(empty)).toBe(false);
    expect(IoHelper.checkPath(occupied)).toBe(true);
    expect(IoHelper.checkPath(parent)).toBe(true);
  });
});
