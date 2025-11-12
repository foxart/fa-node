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

  public constructor(private readonly _secret: string) {}

  /** Секрет ключа */
  public get secret(): string {
    return this._secret;
  }

  /**
   * Шифрование AES-256-GCM с случайным IV и тегом аутентификации
   * @param data Строка или объект для шифрования
   * @param throws Бросать ошибку или логировать и возвращать исходные данные
   */
  public encrypt(data: string, throws = true): string {
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
      console.error(
        new ErrorClass({ name: 'CryptClass encrypt', message: (e as Error).message, stack: (e as Error).stack }),
      );
      return data;
    }
  }

  /**
   * Дешифрование AES-256-GCM
   * @param data Строка, закодированная в base64 после encrypt
   * @param throws Бросать ошибку или логировать и возвращать исходные данные
   */
  public decrypt(data: string, throws = true): string {
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
      console.error(
        new ErrorClass({ name: 'CryptClass decrypt', message: (e as Error).message, stack: (e as Error).stack }),
      );
      return data;
    }
  }

  /** HMAC-SHA256 для безопасного детерминированного хэширования */
  public hmac(value: string): string {
    return createHmac('sha256', this._secret).update(value).digest('hex');
  }

  /** Генерация токенов для LIKE-поиска с HMAC и n-gram */
  public hmacList(value: string, ngramMin = 2, ngramMax = 6): string[] {
    const normalized = this.normalizeValue(value);
    if (!normalized) return [];
    const tokens: string[] = [];
    const seen = new Set<string>();
    const wordIter = normalized.matchAll(/\p{L}+(?:['’\-]\p{L}+)*\p{N}*|\p{N}+/gu);
    const wordList = Array.from(wordIter, (m) => m[0]);
    for (const word of wordList) {
      if (!word || word.trim() === '') continue;
      const fullH = this.hmac(word);
      if (!seen.has(fullH)) {
        tokens.push(fullH);
        seen.add(fullH);
      }
      const maxPrefix = Math.min(word.length - 1, ngramMax);
      if (word.length > ngramMin)
        for (let len = ngramMin; len <= maxPrefix; len++) {
          const prefix = word.slice(0, len);
          if (!prefix) continue;
          const h = this.hmac(prefix);
          if (!seen.has(h)) {
            tokens.push(h);
            seen.add(h);
          }
        }
    }
    return tokens;
  }

  /** MD5-хэш (обычный или с HMAC) */
  public md5(message: string, key?: string): string {
    return key
      ? createHmac('md5', key).update(message).digest(this.encoding)
      : createHash('md5').update(message).digest(this.encoding);
  }

  /** Генерация salt для пароля с указанием количества итераций */
  public salt(rounds = 100_000): string {
    return `${rounds}$${randomBytes(16).toString('hex')}`;
  }

  /** Генерация безопасного токена (по умолчанию 32 байт / 256 бит) */
  public token(lengthBytes = 32): string {
    const buffer = randomBytes(lengthBytes);
    // base64url: заменяем + на -, / на _, убираем =
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  /** UUID v4 через crypto.randomBytes */
  public uuidV4(): string {
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = bytes.toString('hex');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
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

  /** Генерация ключа AES-256 из пароля через PBKDF2 */
  private deriveKey(salt: Buffer): Buffer {
    return pbkdf2Sync(this._secret, salt, this.pbkdf2Iterations, this.pbkdf2KeyLen, this.pbkdf2Digest);
  }
}
