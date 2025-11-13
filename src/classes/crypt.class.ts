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
  private readonly ivLength = 12;
  private readonly normalizeRegExp = /\p{L}+(?:['’\-]\p{L}+)*\p{N}*|\p{N}+/gu;
  private readonly pbkdf2Digest = 'sha256';
  private readonly pbkdf2Iterations = 100000;
  private readonly pbkdf2KeyLen = 32;

  /**
   * @param _secret Секретная строка для HMAC и генерации ключей AES
   */
  public constructor(private readonly _secret: string) {}

  /** Возвращает секретный ключ */
  public get secret(): string {
    return this._secret;
  }

  /**
   * Шифрует строку с использованием AES-256-GCM.
   * @param data Строка для шифрования
   * @param throws Если true, ошибки выбрасываются, иначе логируются и возвращается исходная строка
   * @returns Зашифрованная строка в base64 или исходная строка при ошибке
   */
  public encrypt(data: string | null | undefined, throws = true): string | null | undefined {
    if (!data) {
      return data;
    }
    try {
      const salt: Buffer = randomBytes(16);
      const key: Buffer = this.deriveKey(salt);
      const iv: Buffer = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, key, iv);
      const encrypted: Buffer = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
      const tag: Buffer = cipher.getAuthTag();
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
   * Дешифрует строку, зашифрованную методом encrypt.
   * @param data Зашифрованная строка в base64
   * @param throws Если true, ошибки выбрасываются, иначе логируются и возвращается исходная строка
   * @returns Расшифрованная строка или исходная строка при ошибке
   */
  public decrypt(data: string | null | undefined, throws = true): string | null | undefined {
    if (!data) {
      return data;
    }
    try {
      const decoded: string = Buffer.from(data, this.encoding).toString('utf8');
      const parsed: PayloadInterface = JSON.parse(decoded) as PayloadInterface;
      const key: Buffer = this.deriveKey(Buffer.from(parsed.salt, this.encoding));
      const ivBuf: Buffer = Buffer.from(parsed.iv, this.encoding);
      const tagBuf: Buffer = Buffer.from(parsed.tag, this.encoding);
      const encryptedBuf: Buffer = Buffer.from(parsed.data, this.encoding);
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

  /**
   * Генерация префиксных n-грамм для слов.
   * @param value Входная строка
   * @param ngramMin Минимальная длина n-граммы
   * @param ngramMax Максимальная длина n-граммы
   * @returns Массив уникальных n-грамм и полного слова
   */
  public nGramPrefixList(value: string, ngramMin = 2, ngramMax = 6): string[] {
    const normalized: string = this.normalizeValue(value);
    if (!normalized) {
      return [];
    }
    const result: string[] = [];
    const seen: Set<string> = new Set<string>();
    const matchList: IterableIterator<RegExpMatchArray> = normalized.matchAll(this.normalizeRegExp);
    for (const match of matchList) {
      const word: string = match[0];
      if (!word) {
        continue;
      }
      if (!seen.has(word)) {
        seen.add(word);
        result.push(word);
      }
      const limit: number = Math.min(word.length - 1, ngramMax);
      for (let length = ngramMin; length <= limit; length++) {
        const prefix: string = word.slice(0, length);
        if (!seen.has(prefix)) {
          seen.add(prefix);
          result.push(prefix);
        }
      }
    }
    return result;
  }

  /**
   * Генерация скользящих n-грамм для слов.
   * @param value Входная строка
   * @param ngramMin Минимальная длина n-граммы
   * @param ngramMax Максимальная длина n-граммы
   * @returns Массив уникальных скользящих n-грамм и полного слова
   */
  public nGramSlideList(value: string, ngramMin = 2, ngramMax = 6): string[] {
    const normalized: string = this.normalizeValue(value);
    if (!normalized) {
      return [];
    }
    const result: string[] = [];
    const seen: Set<string> = new Set<string>();
    const matchList: IterableIterator<RegExpMatchArray> = normalized.matchAll(this.normalizeRegExp);
    for (const match of matchList) {
      const word: string = match[0];
      if (!word) {
        continue;
      }
      if (!seen.has(word)) {
        seen.add(word);
        result.push(word);
      }
      const limit: number = Math.min(word.length, ngramMax);
      for (let length = ngramMin; length <= limit; length++) {
        for (let i = 0; i + length <= limit; i++) {
          const slice: string = word.slice(i, i + length);
          if (!seen.has(slice)) {
            seen.add(slice);
            result.push(slice);
          }
        }
      }
    }
    return result;
  }

  /**
   * Создает HMAC-SHA256 для строки с использованием секретного ключа.
   * @param value Входная строка
   * @returns HMAC в формате base64url
   */
  public hmac(value: string): string {
    const raw: string = createHmac('sha256', this._secret).update(value).digest(this.encoding);
    return this.base64ToBase64Url(raw);
  }

  /**
   * Создает MD5-хэш или HMAC-MD5 строки.
   * @param message Входная строка
   * @param key Ключ для HMAC-MD5 (необязательный)
   * @returns Хэш в формате base64url
   */
  public md5(message: string, key?: string): string {
    const digest: string = key
      ? createHmac('md5', key).update(message).digest(this.encoding)
      : createHash('md5').update(message).digest(this.encoding);
    return this.base64ToBase64Url(digest);
  }

  /**
   * Генерация безопасного токена.
   * @param lengthBytes Длина токена в байтах (по умолчанию 32)
   * @returns Токен в формате base64url
   */
  public token(lengthBytes = 32): string {
    const buffer: Buffer = randomBytes(lengthBytes);
    return this.base64ToBase64Url(buffer.toString(this.encoding));
  }

  /**
   * Генерация UUID v4.
   * @returns Строка UUID v4
   */
  public uuidV4(): string {
    const bytes: Buffer = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex: string = bytes.toString('hex');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
  }

  /** Конвертация base64 → base64url */
  private base64ToBase64Url(base64: string): string {
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
