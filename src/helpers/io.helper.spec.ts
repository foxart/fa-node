import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'node:os';
import { join } from 'path';

import { IoHelper } from './io.helper';

describe('IoHelper', () => {
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'fa-node-io-'));
  });

  afterEach(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('should create, read, scan, and delete files', () => {
    const nested = join(temporaryDirectory, 'nested');
    const textFile = join(nested, 'value.txt');
    const jsonFile = join(temporaryDirectory, 'value.json');

    expect(IoHelper.checkPath(textFile)).toBe(false);
    IoHelper.createDirectorySync(nested, true);
    IoHelper.createDirectorySync(nested, true);
    IoHelper.createFileSync(textFile, 'content');
    IoHelper.createFileSync(jsonFile, '{}');

    expect(IoHelper.checkPath(textFile)).toBe(true);
    expect(IoHelper.readFileSync(textFile, 'utf8')).toBe('content');
    expect(IoHelper.scanFilesSync(join(temporaryDirectory, 'missing'))).toStrictEqual([]);
    expect(IoHelper.scanFilesSync(temporaryDirectory, { recursive: true, filter: [/\.txt$/] })).toStrictEqual([
      textFile,
    ]);
    expect(IoHelper.scanFilesSync(temporaryDirectory)).toContain(nested);
    expect(IoHelper.scanDirectoriesSync(join(temporaryDirectory, 'missing'))).toStrictEqual([]);
    expect(IoHelper.scanDirectoriesSync(temporaryDirectory, { recursive: true, filter: [/\.json$/] })).toStrictEqual([
      jsonFile,
    ]);
    expect(IoHelper.scanDirectoriesSync(temporaryDirectory)).toContain(nested);

    IoHelper.deleteFileSync(textFile);
    expect(IoHelper.checkPath(textFile)).toBe(false);
    IoHelper.deleteDirectorySync(nested, { onlyEmpty: true });
    expect(IoHelper.checkPath(nested)).toBe(false);
    const defaultDelete = join(temporaryDirectory, 'default-delete');
    IoHelper.createDirectorySync(defaultDelete);
    expect(() => IoHelper.deleteDirectorySync(defaultDelete)).toThrow();
    IoHelper.deleteDirectorySync(temporaryDirectory, { recursive: true });
    expect(IoHelper.checkPath(temporaryDirectory)).toBe(false);
  });

  it('should retain non-empty directories when deleting only empty trees', () => {
    const parent = join(temporaryDirectory, 'parent');
    const empty = join(parent, 'empty');
    const occupied = join(parent, 'occupied');
    IoHelper.createDirectorySync(empty, true);
    IoHelper.createFileSync(join(occupied, 'value.txt'), 'value');

    IoHelper.deleteDirectorySync(parent, { onlyEmpty: true });

    expect(IoHelper.checkPath(empty)).toBe(false);
    expect(IoHelper.checkPath(occupied)).toBe(true);
    expect(IoHelper.checkPath(parent)).toBe(true);
  });
});
