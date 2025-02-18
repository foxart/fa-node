import * as console from 'node:console';
import { CryptClass } from '../../src';

const CryptHelper = new CryptClass('123');

function encryptDecrypt(): void {
  const data = 'Иван';
  const encrypted = CryptHelper.encrypt(data);
  const decrypted = CryptHelper.decrypt(encrypted);
  // console.log(encryptDecrypt.name, {
  //   data,
  //   encrypted,
  //   decrypted,
  // });
  // 5+VV24sQEGHzBwhK78c6Uw==
  const acc = [];
  for (let i = 0; i < 100; i++) {
    acc.push(0);
  }
  console.log(`1${acc.join('-')}`);
  //
  const a = 'ШОФЁР';
  console.log(a);
}

function comparePassport(): void {
  const password = '123';
  const hash = CryptHelper.passwordCrypt(password);
  console.log(comparePassport.name, {
    password,
    hash,
    valid: CryptHelper.passwordHashCompare(password, hash),
  });
}

export function run(): void {
  encryptDecrypt();
  // comparePassport();
  // console.log(CryptHelper.parseHash(CryptHelper.cryptPassword('123')));
  // console.log(CryptHelper.salt());
  // console.log(CryptHelper.random());
  // console.log(CryptHelper.md5('1234'));
  // console.log(CryptHelper.md5('123'));
}
