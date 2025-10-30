import { CryptClass } from '../index';

describe('CryptClass', () => {
  const secret = 'test-secret';
  const CryptHelper = new CryptClass(secret);

  // ===========================================================
  // 🔍 Tokenization & Normalization Tests
  // ===========================================================
  describe('Tokenization & Normalization', () => {
    const normalize = CryptHelper.normalizeValueForSearch.bind(CryptHelper);
    const tokenize = CryptHelper.getSearchTokenList.bind(CryptHelper);
    const hmac = CryptHelper.hmac.bind(CryptHelper);

    // === BASE INPUTS ===
    const input = 'Привет 你好 مرحبا Hello Grüß 😊';
    const inputLower = input.toLowerCase();
    const inputExtraSpaces = `   ${input}   `;
    const inputPartial = 'Прив Hello مرح';
    const inputEmpty = '';

    it('should produce repeatable tokens for the same input', () => {
      const tokens = tokenize(normalize(input));
      const tokensAgain = tokenize(normalize(input));
      expect(tokens).toEqual(tokensAgain);
    });

    it('should be case-insensitive', () => {
      const tokens = tokenize(normalize(input));
      const tokensLower = tokenize(normalize(inputLower));
      expect(tokens).toEqual(tokensLower);
    });

    it('should ignore extra whitespace', () => {
      const tokens = tokenize(normalize(input));
      const tokensExtraSpaces = tokenize(normalize(inputExtraSpaces));
      expect(tokens).toEqual(tokensExtraSpaces);
    });

    it('should match partial input tokens', () => {
      const tokens = tokenize(normalize(input));
      const tokensPartial = tokenize(normalize(inputPartial));
      tokensPartial.forEach((t) => expect(tokens).toContain(t));
    });

    it('should produce unique tokens', () => {
      const tokens = tokenize(normalize(input));
      expect(tokens.length).toEqual(new Set(tokens).size);
    });

    // === EDGE CASES ===
    it('should handle empty input', () => {
      const tokensEmpty = tokenize(inputEmpty);
      expect(tokensEmpty).toHaveLength(0);
    });

    it('should remove zero-width / invisible characters', () => {
      const invisible = '\uFEFFIvan\u200B';
      const normalized = normalize(invisible);
      const tokensInvisible = tokenize(normalized);
      expect(normalized).toBe('ivan');
      expect(tokensInvisible.length).toBeGreaterThan(0);
    });

    it('should handle punctuation and apostrophes', () => {
      const punctuationInput = "O'Neill, Jean-Luc!";
      const tokens = tokenize(normalize(punctuationInput));
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle numeric tokens', () => {
      const numericInput = 'Room 42B';
      const tokens = tokenize(normalize(numericInput));
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should ignore emoji in tokenization', () => {
      const emojiInput = '😊';
      const tokens = tokenize(normalize(emojiInput));
      expect(tokens).toHaveLength(0);
    });

    it('should normalize combining characters', () => {
      const combiningInput = 'e\u0301'; // é decomposed
      const normalized = normalize(combiningInput);
      const tokens = tokenize(normalized);
      expect(normalized).toBe('é');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle locale-specific letters', () => {
      const localeInput = 'Straße İstanbul Σίσυφος';
      const tokens = tokenize(normalize(localeInput));
      expect(tokens.length).toBeGreaterThan(0);
    });

    // === N-GRAM TEST ===
    it('should generate correct n-gram tokens for "hello"', () => {
      const ngramWord = 'hello';
      const tokens = tokenize(normalize(ngramWord), 2);
      const expectedPrefixes = ['he', 'hel', 'hell', 'hello'];
      expectedPrefixes.forEach((p) => {
        expect(tokens).toContain(hmac(p));
      });
    });
  });

  // ===========================================================
  // 🔐 Encryption / Decryption Tests
  // ===========================================================
  describe('AES-256-GCM Encryption & Decryption', () => {
    it('should encrypt and decrypt string correctly', () => {
      const text = 'Hello world';
      const encrypted = CryptHelper.encrypt(text);
      const decrypted = CryptHelper.decrypt(encrypted);
      expect(decrypted).toBe(text);
    });

    it('should encrypt and decrypt objects correctly', () => {
      const obj = { a: 1, b: 'text' };
      const encrypted = CryptHelper.encrypt(obj);
      const decrypted = CryptHelper.decrypt(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should return input if empty or null', () => {
      expect(CryptHelper.encrypt('')).toBe('');
      expect(CryptHelper.decrypt('')).toBe('');
      expect(CryptHelper.encrypt(null)).toBeNull();
      expect(CryptHelper.decrypt(null)).toBeNull();
    });
  });

  // ===========================================================
  // 🧩 HMAC / MD5 Tests
  // ===========================================================
  describe('HMAC / MD5', () => {
    it('should produce deterministic HMAC', () => {
      const value = 'test';
      const h1 = CryptHelper.hmac(value);
      const h2 = CryptHelper.hmac(value);
      expect(h1).toBe(h2);
    });

    it('should produce MD5 hash correctly', () => {
      const value = 'test';
      const hash = CryptHelper.md5(value);
      expect(hash).toHaveLength(32);
    });

    it('should produce keyed MD5 hash correctly', () => {
      const value = 'test';
      const key = 'secret';
      const hash = CryptHelper.md5(value, key);
      expect(hash).toHaveLength(32);
    });
  });

  // ===========================================================
  // 🔧 Utilities Tests
  // ===========================================================
  describe('Utilities', () => {
    it('should generate random hex string', () => {
      const rand = CryptHelper.random(16);
      expect(rand).toHaveLength(32); // 16 байт → 32 hex символа
    });

    it('should generate valid bcrypt hash and compare', () => {
      const password = 'password123';
      const hash = CryptHelper.passwordCrypt(password);
      expect(CryptHelper.passwordHashCompare(password, hash)).toBe(true);
      expect(CryptHelper.passwordHashCompare('wrong', hash)).toBe(false);
    });

    it('should parse bcrypt hash correctly', () => {
      const password = 'password123';
      const hash = CryptHelper.passwordCrypt(password);
      const parsed = CryptHelper.passwordHashParse(hash);
      // expect(parsed.algorithm).toBe('2b');
      expect(['2a', '2b']).toContain(parsed.algorithm);
      expect(parsed.hash.length).toBeGreaterThan(0);
      expect(parsed.hash.length).toBeGreaterThan(0);
    });

    it('should generate valid UUID v4', () => {
      const id = CryptHelper.uuidV4();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});
