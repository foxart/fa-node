import { CryptHelper, SystemHelper } from '../../src';

async function sleep(milliseconds: number): Promise<void> {
  const timeStart = performance.now();
  await SystemHelper.sleep(milliseconds);
  const timeEnd = performance.now();
  console.log(sleep.name, {
    start: timeStart,
    end: timeEnd,
    duration: timeEnd - timeStart,
  });
}

function writeFile(filePath: string, data: string): void {
  SystemHelper.createFileSync(filePath, data);
  console.log(writeFile.name, { filePath, data });
}

function scanFiles(directory: string, filter?: RegExp[]): void {
  const result = SystemHelper.scanFilesSync(directory, filter);
  console.log(scanFiles.name, { filter, result });
}

function scanDirectories(directory: string, filter?: RegExp[]): void {
  const result = SystemHelper.scanDirectoriesSync(directory, filter);
  console.log(scanDirectories.name, { filter, result });
}

export async function systemExample(): Promise<void> {
  const directory = './temp';
  const data = { name: 'Иван123', password: CryptHelper.salt() };
  await sleep(100);
  writeFile(`${directory}/temp.json`, JSON.stringify(data, null, 4));
  scanFiles(directory);
  scanFiles(directory, [/.+-1\.txt$/]);
  scanDirectories(directory);
  scanDirectories(directory, [/.+-2$/]);
}
