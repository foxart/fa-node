import * as console from 'node:console';
import { CryptClass, DataHelper, PasswordHelper } from '../../src';

const CryptHelper = new CryptClass('123');

function testPassport(password: string): void {
  const original = password;
  const random = DataHelper.randomString();
  const originalEncrypted = PasswordHelper.encrypt(original);
  const originalCompare = PasswordHelper.compareSync(original, originalEncrypted);
  const randomCompare = PasswordHelper.compareSync(random, originalEncrypted);
  console.log({
    original,
    random,
    originalEncrypted,
    originalEncryptedHash: PasswordHelper.parse(originalEncrypted),
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
  const normalize = CryptHelper.normalizeValueForSearch.bind(CryptHelper);
  const tokenize = CryptHelper.getSearchTokenList.bind(CryptHelper);
  const hmac = CryptHelper.hmac.bind(CryptHelper);

  // === BASE INPUTS ===
  const input = 'Привет 你好 مرحبا Hello Grüß 😊';
  const inputAgain = input;
  const inputLower = input.toLowerCase();
  const inputExtraSpaces = `   ${input}   `;
  const inputPartial = 'Прив Hello مرح';
  const inputEmpty = '';

  // === TOKENIZATION ===
  const tokens = tokenize(normalize(input));
  const tokensAgain = tokenize(normalize(inputAgain));
  const tokensLower = tokenize(normalize(inputLower));
  const tokensExtraSpaces = tokenize(normalize(inputExtraSpaces));
  const tokensPartial = tokenize(normalize(inputPartial));

  // === BASE CHECKS ===
  const repeatability = JSON.stringify(tokens) === JSON.stringify(tokensAgain);
  const caseInsensitivity = JSON.stringify(tokens) === JSON.stringify(tokensLower);
  const whitespaceInsensitive = JSON.stringify(tokens) === JSON.stringify(tokensExtraSpaces);
  const partialMatch = tokensPartial.every((t) => tokens.includes(t));
  const uniqueTokens = tokens.length === new Set(tokens).size;

  // === EDGE CASES ===
  const emptyTokens = tokenize(inputEmpty);
  const invisibleNormalized = normalize('\uFEFFIvan\u200B');
  const invisibleTokens = tokenize(invisibleNormalized);

  const punctuationInput = "O'Neill, Jean-Luc!";
  const punctuationTokens = tokenize(normalize(punctuationInput));

  const numericInput = 'Room 42B';
  const numericTokens = tokenize(normalize(numericInput));

  const emojiInput = '😊';
  const emojiTokens = tokenize(normalize(emojiInput));

  const combiningInput = 'e\u0301'; // é decomposed
  const combiningNormalized = normalize(combiningInput);
  const combiningTokens = tokenize(combiningNormalized);

  const localeInput = 'Straße İstanbul Σίσυφος';
  const localeTokens = tokenize(normalize(localeInput));

  // === N-GRAM TEST ===
  const ngramWord = 'hello';
  const ngramTokens = tokenize(normalize(ngramWord), 2);
  const expectedPrefixes = ['he', 'hel', 'hell', 'hello'];
  const ngramCoverage = expectedPrefixes.every((p) => ngramTokens.includes(hmac(p)));

  // === STRUCTURED RESULTS ===
  const tokenizationResults = {
    base: {
      description: 'Базовая многоязычная строка с эмодзи',
      input: input,
      tokenCount: tokens.length,
    },
    repeatability: {
      description: 'Повторная генерация даёт тот же результат',
      input: inputAgain,
      tokenCount: tokensAgain.length,
    },
    caseInsensitivity: {
      description: 'Нормализация и lower-case дают тот же набор токенов (нечувствительность к регистру)',
      input: inputLower,
      tokenCount: tokensLower.length,
    },
    whitespaceInsensitive: {
      description: 'Лишние пробелы игнорируются при нормализации',
      input: inputExtraSpaces,
      tokenCount: tokensExtraSpaces.length,
    },
    partialMatch: {
      description: 'Частичный ввод порождает подмножество токенов полного текста',
      input: inputPartial,
      tokenCount: tokensPartial.length,
    },
    uniqueTokens: {
      description: 'Все токены уникальны (дубликаты отсутствуют)',
      input: input,
      tokenCount: tokens.length,
    },
    empty: {
      description: 'Пустая строка не порождает токенов',
      input: inputEmpty,
      tokenCount: emptyTokens.length,
    },
    invisibleChars: {
      description: 'Zero-width символы удаляются при нормализации',
      input: invisibleNormalized,
      tokenCount: invisibleTokens.length,
    },
    punctuation: {
      description: 'Пунктуация и апострофы корректно токенизируются',
      input: punctuationInput,
      tokenCount: punctuationTokens.length,
    },
    numeric: {
      description: 'Слова с числами токенизируются корректно',
      input: numericInput,
      tokenCount: numericTokens.length,
    },
    emoji: {
      description: 'Эмодзи не порождают шумных токенов',
      input: emojiInput,
      tokenCount: emojiTokens.length,
    },
    combining: {
      description: 'Комбинированные Unicode-символы корректно нормализуются',
      input: combiningInput,
      normalized: combiningNormalized,
      tokenCount: combiningTokens.length,
    },
    localeSpecific: {
      description: 'Локалеспецифичные буквы (ß, İ, Σ) корректно обрабатываются',
      input: localeInput,
      tokenCount: localeTokens.length,
    },
    ngramCoverage: {
      description: 'Для слова hello генерируются ожидаемые префиксы (he, hel, hell, hello)',
      input: ngramWord,
      prefixes: expectedPrefixes,
      coverage: ngramCoverage,
      tokenCount: ngramTokens.length,
    },
  };

  // === SUMMARY CHECK FLAGS ===
  const checks = {
    repeatability,
    caseInsensitivity,
    whitespaceInsensitive,
    partialMatch,
    uniqueTokens,
    ngramCoverage,
    emptyInputOK: emptyTokens.length === 0,
    invisibleOK: invisibleNormalized === 'ivan' && invisibleTokens.length > 0,
    emojiOK: emojiTokens.length === 0,
  };

  // === FINAL LOG ===
  console.log({
    ...tokenizationResults,
    checks,
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
