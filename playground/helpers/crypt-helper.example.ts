import {
  CryptClass,
  LoggerSystemClass,
  NestLoggerApplicationAbstract,
  NestLoggerSystemAbstract,
  SystemHelper,
} from '../../src';

function rotate(rawPayload: string, oldCrypt: CryptClass, newCrypt: CryptClass): string {
  const { dek, encryptedData, ivData, tagData } = oldCrypt.unwrapDek(rawPayload);
  return newCrypt.wrapDEK(dek, encryptedData, ivData, tagData);
}

export function run(): void {
  const crypt1 = new CryptClass({
    kmsSecret: 'kms1',
    hmacSecret: 'hmac1',
  });
  const crypt2 = new CryptClass({
    kmsSecret: 'kms2',
    hmacSecret: 'hmac2',
    // fastMode: true,
  });
  const data = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  //
  const encrypted1 = crypt1.encrypt(data);
  let decrypted1;
  SystemHelper.timeStart('crypt1');
  for (let i = 0; i < 10000; i++) {
    decrypted1 = crypt1.decrypt(encrypted1);
  }
  const time1 = SystemHelper.timeEnd('crypt1');
  //
  const encrypted2 = crypt2.encrypt(data);
  let decrypted2;
  SystemHelper.timeStart('crypt2');
  for (let i = 0; i < 10000; i++) {
    decrypted2 = crypt2.decrypt(encrypted2);
  }
  const time2 = SystemHelper.timeEnd('crypt2');
  // const { dek, encryptedData, ivData, tagData } = crypt1.unwrapDEK(encrypt2 as string);
  // const rotatedWithClass = crypt1.wrapDEK(dek, encryptedData, ivData, tagData);
  //
  // console.log({ encrypted1, decrypted1, time1 });
  // console.log({ encrypted2, decrypted2, time2 });
  // console.log({ dek, encryptedData, ivData, tagData, rotatedWithClass });
  const rotated1 = rotate(encrypted1 as string, crypt1, crypt2);
  // console.log(encrypted1 === rotated1, crypt2.decrypt(rotated1) === data);
  // console.log(
  //   new ErrorClass({
  //     name: 'Error',
  //     message: { a: 1 },
  //   }),
  // );
  // console.log(process.cwd(), __dirname);
  const customConsole = new LoggerSystemClass({
    // traceIndex: 2,
    color: true,
    info: true,
    name: 'NAME',
    pid: true,
    date: true,
    time: true,
    performance: true,
    link: true,
    /** */
    stackError: true,
    stackDebug: true,
    /** */
    sort: true,
  });
  const application = new NestLoggerApplicationAbstract({
    pid: true,
    date: true,
    time: true,
    link: true,
    hidden: true,
    sort: true,
    color: true,
    info: true,
    performance: true,
    stackError: true,
    stackDebug: true,
  });
  const system = new NestLoggerSystemAbstract({
    pid: true,
    date: true,
    time: true,
    link: true,
    hidden: true,
    sort: true,
    color: true,
    info: true,
    performance: true,
    stackError: true,
    stackDebug: true,
  });
  application.warn(new Error('Error').message, '{a}', [1, 2, 3]);
  system.error(new Error('Error').name, '{a}', [1, 2, 3]);
  customConsole.log(process.cwd(), __dirname);
}
//
// AQCYEmmGWt9czQLi7GViYJeiVmI0HdMBCAFsCz2CACDIFof4RCUyAShXOO8YjjFmyHKwho1hG9FlnD2iOQPgy0T5IXX0gyaruaGZ7d32W0EDgozaYXNCyOk0XAlzfZwXuwGfE/0Mnv3xonV5qfBPV3XLVPWbgNAJPMMhl9kajT1hLYYM0rCU2n7M7Udij6rk8wqmDA==
// AQBBmIfVsp58aQ4LjFFsWlxOnM/AIMKKcNi0gupgACDxBi/vFlQdVm3tt81XW3+tqvSYts/UTm6banrf9w0JvetfGKGMvL+wD97AC+A2RI2pG8m+OjhAajnuMJCmtUgnQ9xOjH9sY9wF3SzWSCG0K1K6rZf6ahiUEd/EYhik9ZeRglU+FeVkCJlaFPCIBj491rproA==
