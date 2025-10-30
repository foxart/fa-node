import * as console from 'node:console';
import { CryptClass, DataHelper } from '../../src';

const CryptHelper = new CryptClass('123');

function testPassport(password: string): void {
  const original = password;
  const random = DataHelper.randomString();
  const originalEncrypted = CryptHelper.passwordCrypt(original);
  const originalCompare = CryptHelper.passwordHashCompare(original, originalEncrypted);
  const randomCompare = CryptHelper.passwordHashCompare(random, originalEncrypted);
  console.log({
    original,
    random,
    originalEncrypted,
    originalEncryptedHash: CryptHelper.passwordHashParse(originalEncrypted),
    checks: {
      originalCompare,
      randomCompare,
    },
  });
}

function testEncryptDecrypt(original: string): void {
  // === ENCRYPT / DECRYPT TEST ===
  const encrypted1 = CryptHelper.encrypt(original);
  const encrypted2 = CryptHelper.encrypt(original);
  const decrypted1 = CryptHelper.decrypt(encrypted1);
  const decrypted2 = CryptHelper.decrypt(encrypted2);
  const encryptDeterministic = encrypted1 !== encrypted2;
  const decryptIntegrity = decrypted1 === original && decrypted2 === original;
  console.log({
    input: original,
    encrypted1,
    encrypted2,
    decrypted1,
    decrypted2,
    checks: {
      encryptDeterministic,
      decryptIntegrity,
    },
  });
}

function testHash(): void {
  const input = 'Привет 你好 مرحبا Hello Grüß 😊';
  const inputLower = input.toLowerCase();
  const inputExtraSpaces = `   ${input}   `;
  const inputPartial = 'Прив Hello مرح';
  // === TOKENIZATION ===
  const tokens = CryptHelper.getSearchTokenList(CryptHelper.normalizeValueForSearch(input));
  const tokensAgain = CryptHelper.getSearchTokenList(CryptHelper.normalizeValueForSearch(input));
  const tokensLower = CryptHelper.getSearchTokenList(CryptHelper.normalizeValueForSearch(inputLower));
  const tokensExtraSpaces = CryptHelper.getSearchTokenList(CryptHelper.normalizeValueForSearch(inputExtraSpaces));
  const tokensPartial = CryptHelper.getSearchTokenList(CryptHelper.normalizeValueForSearch(inputPartial));
  // === CHECKS ===
  const repeatability = JSON.stringify(tokens) === JSON.stringify(tokensAgain);
  const caseInsensitivity = JSON.stringify(tokens) === JSON.stringify(tokensLower);
  const whitespaceInsensitive = JSON.stringify(tokens) === JSON.stringify(tokensExtraSpaces);
  const partialMatch = tokensPartial.every((t) => tokens.includes(t));
  // === STRUCTURED OUTPUT (один объект) ===
  const tokenizationResults = {
    repeatability: {
      description: 'Повторная генерация даёт тот же результат',
      input,
      tokens: tokensAgain.length,
    },
    caseInsensitivity: {
      description: 'Lower-case путь: normalize(original) == normalize(original.toLowerCase())',
      inputLower,
      tokens: tokensLower.length,
    },
    whitespaceInsensitive: {
      description: 'Лишние пробелы игнорируются',
      inputExtraSpaces,
      tokens: tokensExtraSpaces.length,
    },
    partialMatch: {
      description: 'Частичные подстроки дают подмножество токенов',
      inputPartial,
      tokens: tokensPartial.length,
    },
  };
  // Финальный единый лог
  console.log({
    input,
    inputLower,
    inputExtraSpaces,
    inputPartial,
    ...tokenizationResults,
    checks: {
      repeatability,
      caseInsensitivity,
      whitespaceInsensitive,
      partialMatch,
    },
  });
}

export function run(): void {
  // testPassport('Qwe123!');
  // testEncryptDecrypt('Lorem ipsum dolor sit amet');
  testHash();
  // console.log(CryptHelper.salt());
  // console.log(CryptHelper.random());
  // console.log(CryptHelper.md5('123'));
}
