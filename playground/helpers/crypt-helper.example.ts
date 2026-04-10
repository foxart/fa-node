import { CryptClass, LoggerNestClass, LoggerNodeClass, SystemHelper } from '../../src';

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
  const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  //
  const encrypted1 = crypt1.encrypt(text);
  let decrypted1;
  SystemHelper.timeStart('crypt1');
  for (let i = 0; i < 10000; i++) {
    decrypted1 = crypt1.decrypt(encrypted1);
  }
  const time1 = SystemHelper.timeEnd('crypt1');
  //
  const encrypted2 = crypt2.encrypt(text);
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
  const nest = new LoggerNestClass({
    pid: true,
    date: true,
    time: true,
    link: true,
    hidden: true,
    sort: true,
    color: true,
    level: true,
    performance: true,
    errorStack: true,
    stackDebug: true,
  });
  const system = new LoggerNodeClass({
    pid: true,
    date: true,
    time: true,
    link: true,
    hidden: true,
    sort: true,
    color: true,
    level: true,
    performance: true,
    errorStack: true,
    stackDebug: true,
  });
  const data = { a: 1, b: [1, 2, 3], c: new Error().name, d: '/abc/def' };
  system.log(data);
  system.warn('/abc/"def"/test/{xxx}/\'asdf\'/[123]/(xxx)');
  system.error('/abc/def');
}
