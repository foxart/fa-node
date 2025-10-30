import bcrypt from 'bcryptjs';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';
import { v4, V4Options } from 'uuid';
import { ErrorClass } from './error.class';

interface PayloadInterface {
  iv: string;
  tag: string;
  data: string;
}

export class CryptClass {
  private readonly algorithm = 'aes-256-gcm';
  private readonly encoding = 'base64';
  private readonly ivLength = 12; // рекомендуемый размер IV для GCM

  public constructor(private readonly _secret: string) {}

  public get secret(): string {
    return this._secret;
  }

  /** AES-256-GCM + случайный IV + аутентификация */
  public encrypt<T>(data: T, throws = true): T {
    if (!data) {
      return data;
    }
    try {
      const key = createHash('sha256').update(this._secret).digest();
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, key, iv);
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
      const encrypted = Buffer.concat([cipher.update(jsonData, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      const payload: PayloadInterface = {
        iv: iv.toString(this.encoding),
        tag: tag.toString(this.encoding),
        data: encrypted.toString(this.encoding),
      };
      return Buffer.from(JSON.stringify(payload)).toString(this.encoding) as T;
    } catch (e) {
      const error = e as Error;
      if (throws) {
        throw error;
      }
      console.error(
        new ErrorClass({
          name: `${this.constructor.name} encrypt`,
          message: error.message,
          stack: error.stack,
        }),
      );
      return data;
    }
  }

  /** Расшифровка AES-256-GCM */
  public decrypt<T>(data: T, throws = true): T {
    if (!data) {
      return data;
    }
    try {
      const key = createHash('sha256').update(this._secret).digest();
      const decoded = Buffer.from(data as string, this.encoding).toString('utf8');
      const { iv, tag, data: encryptedData } = JSON.parse(decoded) as PayloadInterface;
      const decipher = createDecipheriv(this.algorithm, key, Buffer.from(iv, this.encoding));
      decipher.setAuthTag(Buffer.from(tag, this.encoding));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedData, this.encoding)), decipher.final()]);
      const text = decrypted.toString('utf8');
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as T;
      }
    } catch (e) {
      const error = e as Error;
      if (throws) {
        throw error;
      }
      console.error(
        new ErrorClass({
          name: `${this.constructor.name} decrypt`,
          message: error.message,
          stack: error.stack,
        }),
      );
      return data;
    }
  }

  // ===========================================================
  // 🧩 HASH / HMAC
  // ===========================================================

  /** HMAC-SHA256 — для детерминированного безопасного поиска */
  public hmac(value: string): string {
    return createHmac('sha256', this._secret).update(value).digest('hex');
  }

  /** Простой MD5 (или HMAC-MD5) */
  public md5(message: string, key?: string): string {
    return key ? createHmac('md5', key).update(message).digest('hex') : createHash('md5').update(message).digest('hex');
  }

  // ===========================================================
  // 🔍 SEARCH / TOKENIZATION
  // ===========================================================

  /** Универсальная Unicode-нормализация */
  public normalizeValueForSearch(value: string): string {
    // return value.normalize('NFKC').toLocaleLowerCase('und').trim();
    if (!value) return '';
    return value
      .normalize('NFKC') // Сведение всех форм Unicode
      .replace(/\p{Cf}/gu, '') // Удаляем невидимые control-символы (zero-width, etc.)
      .replace(/\s+/g, ' ') // Схлопываем пробелы
      .trim()
      .toLocaleLowerCase('und'); // Unicode-aware lowercasing
  }

  /** Токенизация строки для LIKE-поиска (HMAC n-gram слов)
   *  ngramMin — минимальная длина префикса для генерации n-gram (рекомендуется 2 или 3)
   *  ngramMax — максимальная длина префикса (ограничивает раздувание числа токенов), по умолчанию 6
   */
  public getSearchTokenList(value: string, ngramMin = 2, ngramMax = 6): string[] {
    if (!value) return [];
    const normalized = this.normalizeValueForSearch(value);
    if (!normalized) return [];
    const tokens: string[] = [];
    const seen = new Set<string>();
    // Регекс: слова из букв (поддерживает внутренние апострофы/дефисы), либо числа
    // пример покрывает: O'Neill, Jean-Luc, 王五, 42
    const wordIter = normalized.matchAll(/\p{L}+(?:['’\-]\p{L}+)*\p{N}*|\p{N}+/gu);
    const wordList = Array.from(wordIter, (m) => m[0]);
    for (const word of wordList) {
      // Пропускаем чисто эмодзи/символы (если по каким-то причинам попали)
      if (!word || word.trim() === '') continue;
      // full word token
      const fullH = this.hmac(word);
      if (!seen.has(fullH)) {
        tokens.push(fullH);
        seen.add(fullH);
      }
      // generate n-grams (prefixes) — только если слово длиннее ngramMin
      const maxPrefix = Math.min(word.length - 1, ngramMax); // -1 потому что full word уже добавлен
      if (word.length > ngramMin) {
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
    }
    return tokens;
  }

  // ===========================================================
  // 🔧 MISC / UTILITIES
  // ===========================================================
  public random(nBytes = 16): string {
    return randomBytes(nBytes).toString('hex');
  }

  public salt(rounds = 10): string {
    return bcrypt.genSaltSync(rounds);
  }

  public uuidV4(options?: V4Options): string {
    return v4(options);
  }

  public passwordCrypt(password: string, rounds = 10): string {
    return bcrypt.hashSync(password, rounds);
  }

  public passwordHashCompare(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  public passwordHashParse(hash: string): { algorithm: string; cost: string; salt: string; hash: string } {
    const [, algorithm, cost, data] = hash.split('$');
    return { algorithm, cost, salt: data.slice(0, 22), hash: data.slice(22) };
  }
}
