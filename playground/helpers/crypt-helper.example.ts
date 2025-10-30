import * as console from 'node:console';
import { CryptClass } from '../../src';

const CryptHelper = new CryptClass('123');

function encryptDecrypt(): void {
  const original = 'ivan@example.com';
  const encrypted1 = CryptHelper.encrypt(original);
  const encrypted2 = CryptHelper.encrypt(original);
  const decrypted1 = CryptHelper.decrypt(encrypted1);
  const decrypted2 = CryptHelper.decrypt(encrypted2);
  const hash = CryptHelper.hmac(original);
  console.log(encryptDecrypt.name, {
    original,
    hash,
    encrypted1,
    decrypted1,
    encrypted2,
    decrypted2,
  });
}

function comparePassport(): void {
  const valid = '123456';
  const invalid = '12345';
  const crypted = CryptHelper.passwordCrypt(valid);
  console.log(comparePassport.name, {
    valid: valid,
    invalid: invalid,
    crypted,
    hash: CryptHelper.passwordHashParse(crypted),
    checkValid: CryptHelper.passwordHashCompare(valid, crypted),
    checkInvalid: CryptHelper.passwordHashCompare(invalid, crypted),
  });
}

export function run(): void {
  // encryptDecrypt();
  comparePassport();
  // console.log(CryptHelper.salt());
  // console.log(CryptHelper.random());
  // console.log(CryptHelper.md5('123'));
}
