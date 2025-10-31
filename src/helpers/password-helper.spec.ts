import { PasswordHelper } from '../index';

describe('PasswordHelper', () => {
  const normalPassword = 'password123';
  const wrongPassword = 'wrongPassword';
  const extremeCases = [
    { name: 'empty', password: '' },
    { name: 'long', password: 'p'.repeat(256) },
    { name: 'special chars', password: '!@#$%^&*()_+-=[]{}|;:,.<>?' },
    { name: 'emoji', password: '😀👍💻🔑' },
  ];

  // ===========================================================
  // 🔹 encrypt
  // ===========================================================
  describe('encrypt', () => {
    it('should generate a bcrypt hash', () => {
      const hash = PasswordHelper.encrypt(normalPassword);
      expect(hash).toMatch(/^\$2[aby]\$/); // проверка формата bcrypt
    });

    it('should produce different hashes for same password due to random salt', () => {
      const hash1 = PasswordHelper.encrypt(normalPassword);
      const hash2 = PasswordHelper.encrypt(normalPassword);
      expect(hash1).not.toBe(hash2);
    });

    test.each(extremeCases)('should generate hash for $name password', ({ password }) => {
      const hash = PasswordHelper.encrypt(password);
      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================
  // 🔹 compareSync
  // ===========================================================
  describe('compareSync', () => {
    it('should correctly validate normal password', () => {
      const hash = PasswordHelper.encrypt(normalPassword);
      expect(PasswordHelper.compareSync(normalPassword, hash)).toBe(true);
      expect(PasswordHelper.compareSync(wrongPassword, hash)).toBe(false);
    });

    test.each(extremeCases)('should correctly validate $name password', ({ password }) => {
      const hash = PasswordHelper.encrypt(password);
      expect(PasswordHelper.compareSync(password, hash)).toBe(true);
      expect(PasswordHelper.compareSync(wrongPassword, hash)).toBe(false);
    });
  });

  // ===========================================================
  // 🔹 compareAsync
  // ===========================================================
  describe('compareAsync', () => {
    it('should correctly validate normal password asynchronously', async () => {
      const hash = PasswordHelper.encrypt(normalPassword);
      await expect(PasswordHelper.compareAsync(normalPassword, hash)).resolves.toBe(true);
      await expect(PasswordHelper.compareAsync(wrongPassword, hash)).resolves.toBe(false);
    });

    test.each(extremeCases)('should correctly validate $name password asynchronously', async ({ password }) => {
      const hash = PasswordHelper.encrypt(password);
      await expect(PasswordHelper.compareAsync(password, hash)).resolves.toBe(true);
      await expect(PasswordHelper.compareAsync(wrongPassword, hash)).resolves.toBe(false);
    });
  });

  // ===========================================================
  // 🔹 parse
  // ===========================================================
  describe('parse', () => {
    it('should correctly parse normal password hash', () => {
      const hash = PasswordHelper.encrypt(normalPassword);
      const parsed = PasswordHelper.parse(hash);
      expect(['2a', '2b', '2y']).toContain(parsed.algorithm);
      expect(parseInt(parsed.cost, 10)).toBeGreaterThan(0);
      expect(parsed.salt.length).toBe(22);
      expect(parsed.hash.length).toBeGreaterThan(0);
    });

    test.each(extremeCases)('should correctly parse $name password hash', ({ password }) => {
      const hash = PasswordHelper.encrypt(password);
      const parsed = PasswordHelper.parse(hash);
      expect(['2a', '2b', '2y']).toContain(parsed.algorithm);
      expect(parseInt(parsed.cost, 10)).toBeGreaterThan(0);
      expect(parsed.salt.length).toBe(22);
      expect(parsed.hash.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================
  // 🔹 invalid hashes
  // ===========================================================
  describe('invalid hashes', () => {
    const invalidHashes = ['$2b$10$invalidsaltandhashdata', '', 'notahash', '$2a$10$short'];

    test.each(invalidHashes)('compareSync returns false for "%s"', (hash) => {
      expect(PasswordHelper.compareSync(normalPassword, hash)).toBe(false);
    });

    test.each(invalidHashes)('compareAsync resolves false for "%s"', async (hash) => {
      await expect(PasswordHelper.compareAsync(normalPassword, hash)).resolves.toBe(false);
    });
  });
});
