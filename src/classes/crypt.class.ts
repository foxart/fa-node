import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';
import { ErrorClass } from './error.class';

/**
 * Класс для криптографических операций: шифрование/дешифрование AES-256-GCM,
 * HMAC, MD5, генерация случайных значений, UUID и токенизация текста.
 */
export class CryptClass {
  private readonly digest = 'sha256';
  private readonly algorithm = 'aes-256-gcm';
  private readonly encoding = 'base64';
  private readonly ivLength = 12; // AES-GCM стандарт
  private readonly tagLength = 16; // AES-GCM стандарт
  private readonly normalizeRegExp = /\p{L}+(?:['’\-]\p{L}+)*\p{N}*|\p{N}+/gu;
  private readonly kmsHash: Buffer;
  private readonly hmacHash: Buffer;

  public constructor(
    private readonly kmsSecret: string,
    private readonly hmacSecret: string,
  ) {
    this.kmsHash = createHash(this.digest).update(this.kmsSecret).digest();
    this.hmacHash = createHash(this.digest).update(this.hmacSecret).digest();
  }

  public encrypt(value: string | null | undefined, throws = true): string | null | undefined {
    if (!value) {
      return value;
    }
    try {
      // 1️⃣ Генерация DEK
      const dek = randomBytes(32);
      // 2️⃣ Шифруем DEK KMS ключом
      const ivDek = randomBytes(this.ivLength);
      const cipherDek = createCipheriv(this.algorithm, this.kmsHash, ivDek);
      const encDek = Buffer.concat([cipherDek.update(dek), cipherDek.final()]);
      const tagDek = cipherDek.getAuthTag();
      // 3️⃣ Шифруем данные DEK
      const ivData = randomBytes(this.ivLength);
      const cipherData = createCipheriv(this.algorithm, dek, ivData);
      const encData = Buffer.concat([cipherData.update(value, 'utf8'), cipherData.final()]);
      const tagData = cipherData.getAuthTag();
      // 4️⃣ Компактная упаковка: IV/tag/DEK length + DEK + data + tag
      const dekLengthBuf = Buffer.alloc(2); // 2 байта для длины DEK
      dekLengthBuf.writeUInt16BE(encDek.length, 0);
      const combined = Buffer.concat([
        ivDek, // 12 байт
        tagDek, // 16 байт
        dekLengthBuf, // 2 байта
        encDek, // variable
        ivData, // 12 байт
        tagData, // 16 байт
        encData, // variable
      ]);
      return combined.toString(this.encoding);
    } catch (e) {
      if (throws) {
        throw e;
      }
      if (e instanceof Error) {
        console.error(new ErrorClass({ name: 'CryptClass encrypt', message: e.message, stack: e.stack }));
      }
      return value;
    }
  }

  public decrypt(value: string | null | undefined, throws = true): string | null | undefined {
    if (!value) {
      return value;
    }
    try {
      const buf = Buffer.from(value, this.encoding);
      // 1️⃣ Распаковка DEK
      let offset = 0;
      const ivDek = buf.subarray(offset, offset + this.ivLength);
      offset += this.ivLength;
      const tagDek = buf.subarray(offset, offset + this.tagLength);
      offset += this.tagLength;
      const dekLength = buf.readUInt16BE(offset);
      offset += 2;
      const encDek = buf.subarray(offset, offset + dekLength);
      offset += dekLength;
      const decipherDek = createDecipheriv(this.algorithm, this.kmsHash, ivDek);
      decipherDek.setAuthTag(tagDek);
      const dek = Buffer.concat([decipherDek.update(encDek), decipherDek.final()]);
      // 2️⃣ Распаковка данных
      const ivData = buf.subarray(offset, offset + this.ivLength);
      offset += this.ivLength;
      const tagData = buf.subarray(offset, offset + this.tagLength);
      offset += this.tagLength;
      const encData = buf.subarray(offset);
      const decipherData = createDecipheriv(this.algorithm, dek, ivData);
      decipherData.setAuthTag(tagData);
      const decrypted = Buffer.concat([decipherData.update(encData), decipherData.final()]);
      return decrypted.toString('utf8');
    } catch (e) {
      if (throws) {
        throw e;
      }
      if (e instanceof Error) {
        console.error(new ErrorClass({ name: 'CryptClass decrypt', message: e.message, stack: e.stack }));
      }
      return value;
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
      if (!seen.has(word)) {
        seen.add(word);
        result.push(word);
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

  public hmac(value: string): string {
    const hmac = createHmac(this.digest, this.hmacHash).update(value).digest(this.encoding);
    return this.base64ToBase64Url(hmac);
  }

  public md5(message: string, key?: string): string {
    const digest: string = key
      ? createHmac('md5', key).update(message).digest(this.encoding)
      : createHash('md5').update(message).digest(this.encoding);
    return this.base64ToBase64Url(digest);
  }

  public token(lengthBytes = 32): string {
    return this.base64ToBase64Url(randomBytes(lengthBytes).toString(this.encoding));
  }

  public uuidV4(): string {
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
  }

  /**
   * PRIVATE
   */
  private base64ToBase64Url(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private normalizeValue(value: string): string {
    return value
      .normalize('NFKC')
      .replace(/\p{Cf}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('und');
  }
}
