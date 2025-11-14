import { CryptClass } from '../index';

describe('CryptClass', () => {
  const crypt = new CryptClass({ kmsSecret: 'kms', hmacSecret: 'hmac' });

  describe('encrypt & decrypt', () => {
    it('should encrypt and decrypt strings correctly', () => {
      const input = 'Hello world';
      const encrypted = crypt.encrypt(input);
      expect(crypt.decrypt(encrypted)).toBe(input);
    });

    it('should produce different encrypted values for same input (random IV)', () => {
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

  describe('unwrapDek & wrapDEK', () => {
    it('should correctly unwrap and wrap encrypted data', () => {
      const input = 'rotation test';
      const encrypted = crypt.encrypt(input);
      const { dek, encryptedData, ivData, tagData } = crypt.unwrapDek(encrypted!);
      const rotated = crypt.wrapDEK(dek, encryptedData, ivData, tagData);
      expect(crypt.decrypt(rotated)).toBe(input);
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
  });

  describe('uuidLike', () => {
    it('should produce valid UUID v4', () => {
      const uuid = crypt.uuidLike();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should produce unique UUIDs on consecutive calls', () => {
      const u1 = crypt.uuidLike();
      const u2 = crypt.uuidLike();
      expect(u1).not.toBe(u2);
    });
  });

  describe('nGramPrefixList', () => {
    it('should generate correct prefix n-grams for a single word', () => {
      const word = 'hello';
      const tokens = crypt.nGramPrefixList(word, 2, 3).sort();
      expect(tokens).toStrictEqual(['he', 'hel', 'hello'].sort());
      expect(tokens.length).toBe(new Set(tokens).size);
    });

    it('should handle multiple words', () => {
      const text = 'hello world';
      const tokens = crypt.nGramPrefixList(text, 2, 3).sort();
      expect(tokens).toStrictEqual(['he', 'hel', 'hello', 'wo', 'wor', 'world'].sort());
      expect(tokens.length).toBe(new Set(tokens).size);
    });
  });

  describe('nGramSlideList', () => {
    it('should generate correct sliding n-grams for a single word', () => {
      const word = 'hello';
      const tokens = crypt.nGramSlideList(word, 2, 3).sort();
      expect(tokens).toStrictEqual(['he', 'el', 'hel', 'hello'].sort());
      expect(tokens.length).toBe(new Set(tokens).size);
    });

    it('should handle multiple words', () => {
      const text = 'hello world';
      const tokens = crypt.nGramSlideList(text, 2, 3).sort();
      expect(tokens).toStrictEqual(['he', 'el', 'hel', 'hello', 'wo', 'or', 'wor', 'world'].sort());
      expect(tokens.length).toBe(new Set(tokens).size);
    });
  });
});
