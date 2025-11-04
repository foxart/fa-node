import { CryptClass } from '../index';

describe('CryptClass', () => {
  const crypt = new CryptClass('secret');

  describe('normalizeValueForSearch', () => {
    it('should normalize case, whitespace, and invisible chars', () => {
      const input = '   Привет \u200B ';
      expect(crypt.normalizeValueForSearch(input)).toBe('привет');
    });

    it('should normalize combining characters (é)', () => {
      const input = 'e\u0301';
      expect(crypt.normalizeValueForSearch(input)).toBe('é');
    });

    it('should handle locale-specific letters', () => {
      const input = 'Straße İstanbul Σίσυφος';
      const normalized = crypt.normalizeValueForSearch(input);
      expect(normalized.includes('straße')).toBe(true);
      expect(normalized.includes('i̇stanbul')).toBe(true); // i + dot
      expect(normalized.includes('σίσυφος')).toBe(true);
    });

    it('should handle multiple combining diacritics', () => {
      const input = 'o\u0308\u0301'; // o + diaeresis + acute
      expect(crypt.normalizeValueForSearch(input)).toBe('ö́');
    });

    it('should handle zero-width joiners', () => {
      const input = 'a\u200Db';
      expect(crypt.normalizeValueForSearch(input)).toBe('ab'); // схлопываются пробелы
    });
  });

  describe('getSearchTokenList', () => {
    const hmac = (value: string): string => crypt.hmac(value);

    it('should generate correct n-gram prefixes for a single word', () => {
      const word = 'hello';
      const tokens = crypt.getSearchTokenList(word, 2, 4);
      ['he', 'hel', 'hell'].forEach((p) => expect(tokens).toContain(hmac(p)));
      expect(tokens).toContain(hmac(word));
      expect(tokens.length).toBe(new Set(tokens).size);
    });

    it('should handle multiple words correctly', () => {
      const text = 'Hello World';
      const tokens = crypt.getSearchTokenList(text, 2, 4);
      ['hello', 'world'].forEach((word) => {
        expect(tokens).toContain(hmac(word));
        const len = Math.min(word.length - 1, 4);
        for (let l = 2; l <= len; l++) {
          expect(tokens).toContain(hmac(word.slice(0, l)));
        }
      });
      expect(tokens.length).toBe(new Set(tokens).size);
    });

    it('should generate tokens with correct structure', () => {
      const text = "O'Neill Jean-Luc 42";
      const tokens = crypt.getSearchTokenList(text, 2, 4);
      // проверяем, что токены не пустые
      expect(tokens.length).toBeGreaterThan(0);
      // уникальные токены
      expect(tokens.length).toBe(new Set(tokens).size);
      // проверяем формат SHA256 hex
      tokens.forEach((t) => expect(t).toMatch(/^[a-f0-9]{64}$/));
    });

    it('should handle words with numbers', () => {
      const text = 'abc123 42';
      const tokens = crypt.getSearchTokenList(text, 2, 4);
      ['abc123', '42'].forEach((word) => expect(tokens).toContain(hmac(word)));
    });

    it('should skip invalid/emoji-only words', () => {
      expect(crypt.getSearchTokenList('😊 🚀')).toHaveLength(0);
    });

    it('should return empty array for empty string', () => {
      expect(crypt.getSearchTokenList('')).toHaveLength(0);
    });
  });

  describe('encrypt & decrypt', () => {
    it('should encrypt and decrypt strings correctly', () => {
      const input = 'Hello world';
      const encrypted = crypt.encrypt(input);
      expect(crypt.decrypt(encrypted)).toBe(input);
    });

    // it('should encrypt and decrypt objects correctly', () => {
    //   const obj = { a: 1, b: 'text', nested: { x: 42 } };
    //   const encrypted = crypt.encrypt(obj);
    //   expect(crypt.decrypt(encrypted)).toEqual(obj);
    // });

    it('should produce different encrypted values for same input (due to random IV)', () => {
      const input = 'repeat';
      const e1 = crypt.encrypt(input);
      const e2 = crypt.encrypt(input);
      expect(e1).not.toBe(e2);
      expect(crypt.decrypt(e1)).toBe(input);
      expect(crypt.decrypt(e2)).toBe(input);
    });

    it('should throw on invalid data if throws=true', () => {
      expect(() => crypt.decrypt('invalid', true)).toThrow();
    });

    it('should not throw and return input if throws=false', () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(crypt.decrypt('invalid', false)).toBe('invalid');
    });
  });

  describe('hmac', () => {
    it('should produce deterministic HMAC for same input', () => {
      expect(crypt.hmac('test')).toBe(crypt.hmac('test'));
    });

    it('should produce different HMAC for different input', () => {
      expect(crypt.hmac('test1')).not.toBe(crypt.hmac('test2'));
    });

    it('should produce HMAC for empty string', () => {
      expect(typeof crypt.hmac('')).toBe('string');
      expect(crypt.hmac('')).toHaveLength(64); // sha256 hex length
    });
  });

  describe('md5', () => {
    it('should produce consistent MD5 hash without key', () => {
      const hash1 = crypt.md5('test');
      const hash2 = crypt.md5('test');
      expect(hash1).toBe(hash2);
    });

    it('should produce different MD5 hash for different inputs', () => {
      expect(crypt.md5('test1')).not.toBe(crypt.md5('test2'));
    });

    it('should produce consistent HMAC-MD5 with key', () => {
      const hash1 = crypt.md5('test', 'key');
      const hash2 = crypt.md5('test', 'key');
      expect(hash1).toBe(hash2);
    });

    it('should produce different HMAC-MD5 for different keys', () => {
      const hash1 = crypt.md5('test', 'key1');
      const hash2 = crypt.md5('test', 'key2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('salt', () => {
    it('should produce a string with rounds prefix', () => {
      const s = crypt.salt(5000);
      expect(s.startsWith('5000$')).toBe(true);
    });

    it('should produce different salts on consecutive calls', () => {
      const s1 = crypt.salt();
      const s2 = crypt.salt();
      expect(s1).not.toBe(s2);
    });
  });

  describe('token', () => {
    it('should generate a non-empty token', () => {
      const token = crypt.token();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens on consecutive calls', () => {
      const token1 = crypt.token();
      const token2 = crypt.token();
      expect(token1).not.toBe(token2);
    });

    it('should generate a base64url-safe token', () => {
      const token = crypt.token();
      expect(token).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it('should allow custom length in bytes', () => {
      const token = crypt.token(16); // 128 бит
      const decoded = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      expect(decoded.length).toBe(16);
    });

    it('should default to 32 bytes (256 bits)', () => {
      const token = crypt.token();
      const decoded = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      expect(decoded.length).toBe(32);
    });
  });

  describe('uuidV4', () => {
    it('should produce valid UUID v4', () => {
      const uuid = crypt.uuidV4();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should produce unique UUIDs on consecutive calls', () => {
      const u1 = crypt.uuidV4();
      const u2 = crypt.uuidV4();
      expect(u1).not.toBe(u2);
    });
  });
});
