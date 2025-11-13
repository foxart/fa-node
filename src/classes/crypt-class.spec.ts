import { CryptClass } from '../index';

describe('CryptClass', () => {
  const crypt = new CryptClass('secret', 'pepper');

  describe('encrypt & decrypt', () => {
    it('should encrypt and decrypt strings correctly', () => {
      const input = 'Hello world';
      const encrypted = crypt.encrypt(input);
      expect(crypt.decrypt(encrypted)).toBe(input);
    });

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

    it('should produce URL-safe base64 string', () => {
      const result = crypt.hmac('some');
      expect(result).toMatch(/^[A-Za-z0-9\-_]+$/);
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
      const token = crypt.token(16);
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

  describe('nGramPrefixList', () => {
    it('should generate correct prefix n-grams for a single word', () => {
      const word = 'hello';
      const tokens = crypt.nGramPrefixList(word, 2, 3).sort();
      expect(tokens).toStrictEqual(['hello', 'he', 'hel'].sort());
      expect(tokens.length).toBe(new Set(tokens).size);
    });

    it('should handle multiple words', () => {
      const text = 'hello world';
      const tokens = crypt.nGramPrefixList(text, 2, 3).sort();
      expect(tokens).toStrictEqual(['hello', 'he', 'hel', 'world', 'wo', 'wor'].sort());
      expect(tokens.length).toBe(new Set(tokens).size);
    });
  });

  describe('nGramSlideList', () => {
    it('should generate correct sliding n-grams for a single word', () => {
      const word = 'hello';
      const tokens = crypt.nGramSlideList(word, 2, 3).sort();
      expect(tokens).toStrictEqual(['hello', 'he', 'el', 'hel'].sort());
      expect(tokens.length).toBe(new Set(tokens).size);
    });

    it('should handle multiple words', () => {
      const text = 'abc def';
      const tokens = crypt.nGramSlideList(text, 2, 3).sort();
      expect(tokens).toStrictEqual(['abc', 'ab', 'bc', 'def', 'de', 'ef'].sort());
      expect(tokens.length).toBe(new Set(tokens).size);
    });
  });
});
