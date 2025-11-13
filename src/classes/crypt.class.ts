import { createCipheriv, createDecipheriv, createHash, createHmac, pbkdf2Sync, randomBytes } from 'crypto';
import { ErrorClass } from './error.class';

interface PayloadInterface {
  iv: string;
  tag: string;
  data: string;
  salt: string;
}

/**
 * Класс для криптографических операций: шифрование/дешифрование AES-256-GCM,
 * HMAC, MD5, генерация случайных значений, UUID и токенизация текста.
 */
export class CryptClass {
  private readonly algorithm = 'aes-256-gcm';
  private readonly encoding = 'base64';
  private readonly ivLength = 12; // рекомендуемый размер IV для GCM
  private readonly pbkdf2Iterations = 100_000; // безопасный минимум итераций PBKDF2
  private readonly pbkdf2KeyLen = 32; // 256-бит ключ
  private readonly pbkdf2Digest = 'sha256';
  private readonly normalizeRegExp = /\p{L}+(?:['’\-]\p{L}+)*\p{N}*|\p{N}+/gu;

  public constructor(private readonly _secret: string) {}

  /** Секрет ключа */
  public get secret(): string {
    return this._secret;
  }

  /**
   * Шифрование AES-256-GCM с случайным IV и тегом аутентификации
   * @param data Строка для шифрования
   * @param throws Бросать ошибку или логировать и возвращать исходные данные
   */
  public encrypt(data: string | null | undefined, throws = true): string | null | undefined {
    if (!data) {
      return data;
    }
    try {
      const salt = randomBytes(16);
      const key = this.deriveKey(salt);
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, key, iv);
      const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      const payload: PayloadInterface = {
        iv: iv.toString(this.encoding),
        tag: tag.toString(this.encoding),
        data: encrypted.toString(this.encoding),
        salt: salt.toString(this.encoding),
      };
      return Buffer.from(JSON.stringify(payload)).toString(this.encoding);
    } catch (e) {
      if (throws) {
        throw e;
      }
      if (e instanceof Error) {
        console.error(new ErrorClass({ name: 'CryptClass encrypt', message: e.message, stack: e.stack }));
      }
      return data;
    }
  }

  /**
   * Дешифрование AES-256-GCM
   * @param data Строка, закодированная в base64 после encrypt
   * @param throws Бросать ошибку или логировать и возвращать исходные данные
   */
  public decrypt(data: string | null | undefined, throws = true): string | null | undefined {
    if (!data) {
      return data;
    }
    try {
      const decoded = Buffer.from(data, this.encoding).toString('utf8');
      const parsed = JSON.parse(decoded) as PayloadInterface;
      const key = this.deriveKey(Buffer.from(parsed.salt, this.encoding));
      const ivBuf = Buffer.from(parsed.iv, this.encoding);
      const tagBuf = Buffer.from(parsed.tag, this.encoding);
      const encryptedBuf = Buffer.from(parsed.data, this.encoding);
      const decipher = createDecipheriv(this.algorithm, key, ivBuf);
      decipher.setAuthTag(tagBuf);
      return Buffer.concat([decipher.update(encryptedBuf), decipher.final()]).toString('utf8');
    } catch (e) {
      if (throws) {
        throw e;
      }
      if (e instanceof Error) {
        console.error(new ErrorClass({ name: 'CryptClass decrypt', message: e.message, stack: e.stack }));
      }
      return data;
    }
  }

  public nGramPrefixList(value: string, ngramMin = 2, ngramMax = 6): string[] {
    const normalized = this.normalizeValue(value);
    if (!normalized) {
      return [];
    }
    const result: string[] = [];
    const seen = new Set<string>();
    const matchList = normalized.matchAll(this.normalizeRegExp);
    for (const match of matchList) {
      const word = match[0];
      if (!word) {
        continue;
      }
      // всегда добавляем полное слово
      const fullWord = word;
      if (!seen.has(fullWord)) {
        seen.add(fullWord);
        result.push(fullWord);
      }
      const limit = Math.min(word.length - 1, ngramMax);
      for (let length = ngramMin; length <= limit; length++) {
        const prefix = word.slice(0, length);
        if (!seen.has(prefix)) {
          seen.add(prefix);
          result.push(prefix);
        }
      }
    }
    return result;
  }

  public nGramSlideList(value: string, ngramMin = 2, ngramMax = 6): string[] {
    const normalized = this.normalizeValue(value);
    if (!normalized) {
      return [];
    }
    const result: string[] = [];
    const seen = new Set<string>();
    const matchList = normalized.matchAll(this.normalizeRegExp);
    for (const match of matchList) {
      const word = match[0];
      if (!word) {
        continue;
      }
      if (!seen.has(word)) {
        seen.add(word);
        result.push(word);
      }
      const limit = Math.min(word.length, ngramMax);
      for (let length = ngramMin; length <= limit; length++) {
        for (let i = 0; i + length <= limit; i++) {
          const slice = word.slice(i, i + length);
          if (!seen.has(slice)) {
            seen.add(slice);
            result.push(slice);
          }
        }
      }
    }
    return result;
  }

  /** HMAC-SHA256 */
  public hmac(value: string): string {
    const raw = createHmac('sha256', this._secret).update(value).digest(this.encoding);
    return this.base64ToBase64Url(raw);
  }

  /** MD5-хэш (обычный или с HMAC, лучше не использовать в security-контексте) */
  public md5(message: string, key?: string): string {
    const digest = key
      ? createHmac('md5', key).update(message).digest(this.encoding)
      : createHash('md5').update(message).digest(this.encoding);
    return this.base64ToBase64Url(digest);
  }

  /** Генерация salt для пароля с указанием количества итераций */
  // public salt(rounds = 100_000): string {
  //   return `${rounds}$${randomBytes(16).toString('hex')}`;
  // }

  /** Генерация безопасного токена (по умолчанию 32 байт / 256 бит) */
  public token(lengthBytes = 32): string {
    const buffer = randomBytes(lengthBytes);
    return this.base64ToBase64Url(buffer.toString(this.encoding));
  }

  /** UUID v4 через crypto.randomBytes */
  public uuidV4(): string {
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = bytes.toString('hex');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
  }

  /** Вспомогательная функция: конвертировать base64 → base64url */
  private base64ToBase64Url(base64: string): string {
    // base64url: заменяем + на -, / на _, убираем =
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  /** Генерация ключа AES-256 из пароля через PBKDF2 */
  private deriveKey(salt: Buffer): Buffer {
    return pbkdf2Sync(this._secret, salt, this.pbkdf2Iterations, this.pbkdf2KeyLen, this.pbkdf2Digest);
  }

  /** Unicode-нормализация для поиска и сравнения текста */
  private normalizeValue(value: string): string {
    return value
      .normalize('NFKC')
      .replace(/\p{Cf}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('und');
  }
}
