import { createCipheriv, createDecipheriv, createHash, createHmac, pbkdf2Sync, randomBytes } from 'crypto';
import { ErrorClass } from './error.class';

interface PayloadInterface {
  v: number;
  i: string;
  t: string;
  d: string;
}

interface OptionsInterface {
  kmsKey?: Buffer;
  kmsSecret?: string | Buffer;
  kmsSalt?: string | Buffer;
  kmsIterations?: number;
  hmacKey?: Buffer;
  hmacSecret?: string | Buffer;
  fastMode?: boolean;
  encoding?: BufferEncoding;
}

export class CryptClass {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12;
  private readonly tagLength = 16;
  private readonly encoding: BufferEncoding;
  private readonly kmsKey: Buffer;
  private readonly hmacKey: Buffer;
  private readonly fastMode: boolean;
  private readonly version = 1;
  private readonly normalizeRegExp = /\p{L}+(?:['’-]\p{L}+)*\p{N}*|\p{N}+/gu;

  public constructor(options: OptionsInterface = {}) {
    this.encoding = options.encoding ?? 'base64';
    this.fastMode = Boolean(options.fastMode);
    if (options.kmsKey) {
      if (!Buffer.isBuffer(options.kmsKey) || options.kmsKey.length !== 32) {
        throw new Error('kmsKey must be 32 bytes');
      }
      this.kmsKey = options.kmsKey;
    } else if (options.kmsSecret) {
      const salt = options.kmsSalt ?? 'default-salt-change-me';
      const iterations = options.kmsIterations ?? 100_000;
      this.kmsKey = pbkdf2Sync(
        Buffer.isBuffer(options.kmsSecret) ? options.kmsSecret : String(options.kmsSecret),
        salt,
        iterations,
        32,
        'sha256',
      );
    } else {
      throw new Error('kmsKey or kmsSecret required');
    }
    if (options.hmacKey) {
      this.hmacKey = Buffer.isBuffer(options.hmacKey)
        ? options.hmacKey
        : createHash('sha256').update(options.hmacKey).digest();
    } else if (options.hmacSecret) {
      this.hmacKey = createHash('sha256').update(options.hmacSecret).digest();
    } else {
      throw new Error('hmacKey or hmacSecret required');
    }
  }

  // PUBLIC API ------------------------------
  public encrypt(value: string | null | undefined, throws = true): string | null | undefined {
    if (!value) return value;
    try {
      return this.fastMode ? this.encryptFast(value) : this.encryptEnvelope(value);
    } catch (e) {
      if (!throws) {
        if (e instanceof Error)
          console.error(
            new ErrorClass({
              name: 'CryptClass encrypt',
              message: e.message,
              stack: e.stack,
            }),
          );
        return value;
      }
      throw e;
    }
  }

  public decrypt(value: string | null | undefined, throws = true): string | null | undefined {
    if (!value) return value;
    try {
      return this.fastMode ? this.decryptFast(value) : this.decryptEnvelope(value);
    } catch (e) {
      if (!throws) {
        if (e instanceof Error)
          console.error(
            new ErrorClass({
              name: 'CryptClass decrypt',
              message: e.message,
              stack: e.stack,
            }),
          );
        return value;
      }
      throw e;
    }
  }

  public wrapDEK(dek: Buffer, encryptedData: Buffer, ivData: Buffer, tagData: Buffer): string {
    const ivDek = randomBytes(this.ivLength);
    const cDek = createCipheriv(this.algorithm, this.kmsKey, ivDek);
    const encDek = Buffer.concat([cDek.update(dek), cDek.final()]);
    const tagDek = cDek.getAuthTag();
    const lenDek = encDek.length;
    const total =
      1 + // version
      1 + // flags
      this.ivLength +
      this.tagLength +
      2 + // len
      lenDek +
      this.ivLength +
      this.tagLength +
      encryptedData.length;
    const out = Buffer.allocUnsafe(total);
    let o = 0;
    out.writeUInt8(this.version, o++);
    out.writeUInt8(0, o++);
    ivDek.copy(out, o);
    o += this.ivLength;
    tagDek.copy(out, o);
    o += this.tagLength;
    out.writeUInt16BE(lenDek, o);
    o += 2;
    encDek.copy(out, o);
    o += lenDek;
    ivData.copy(out, o);
    o += this.ivLength;
    tagData.copy(out, o);
    o += this.tagLength;
    encryptedData.copy(out, o);
    return out.toString(this.encoding);
  }

  public unwrapDek(payload: string): { dek: Buffer; encryptedData: Buffer; ivData: Buffer; tagData: Buffer } {
    const buf = Buffer.from(payload, this.encoding);
    let o = 0;
    const ver = buf.readUInt8(o++);
    if (ver !== this.version) {
      throw new ErrorClass({
        name: 'unwrapDek',
        message: `Unsupported version for: ${payload}`,
        stack: new Error().stack,
      });
    }
    o++; // flags
    const ivDek = buf.subarray(o, o + this.ivLength);
    o += this.ivLength;
    const tagDek = buf.subarray(o, o + this.tagLength);
    o += this.tagLength;
    const lenDek = buf.readUInt16BE(o);
    o += 2;
    const encDek = buf.subarray(o, o + lenDek);
    o += lenDek;
    const dDek = createDecipheriv(this.algorithm, this.kmsKey, ivDek);
    dDek.setAuthTag(tagDek);
    const dek = Buffer.concat([dDek.update(encDek), dDek.final()]);
    const ivData = buf.subarray(o, o + this.ivLength);
    o += this.ivLength;
    const tagData = buf.subarray(o, o + this.tagLength);
    o += this.tagLength;
    const encryptedData = buf.subarray(o);
    return { dek, encryptedData, ivData, tagData };
  }

  // HMAC for deterministic hashing
  public hmac(value: string): string {
    return this.base64ToBase64Url(createHmac('sha256', this.hmacKey).update(value).digest('hex'));
  }

  public token(n = 32): string {
    return this.base64ToBase64Url(randomBytes(n).toString(this.encoding));
  }

  public uuidLike(): string {
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
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

  // FAST MODE ------------------------------
  private encryptFast(plain: string): string {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.kmsKey, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Compact JSON -> base64
    const payload: PayloadInterface = {
      v: this.version,
      i: iv.toString(this.encoding),
      t: tag.toString(this.encoding),
      d: enc.toString(this.encoding),
    };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString(this.encoding);
  }

  private decryptFast(payloadB64: string): string {
    const json = Buffer.from(payloadB64, this.encoding).toString('utf8');
    const obj = JSON.parse(json) as PayloadInterface;
    const iv = Buffer.from(obj.i, this.encoding);
    const tag = Buffer.from(obj.t, this.encoding);
    const data = Buffer.from(obj.d, this.encoding);
    const decipher = createDecipheriv(this.algorithm, this.kmsKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  // ENVELOPE MODE ------------------------------
  private encryptEnvelope(plain: string): string {
    const dek = randomBytes(32);
    // Encrypt DEK
    const ivDek = randomBytes(this.ivLength);
    const cDek = createCipheriv(this.algorithm, this.kmsKey, ivDek);
    const encDek = Buffer.concat([cDek.update(dek), cDek.final()]);
    const tagDek = cDek.getAuthTag();
    // Encrypt data with DEK
    const ivData = randomBytes(this.ivLength);
    const cData = createCipheriv(this.algorithm, dek, ivData);
    const encData = Buffer.concat([cData.update(plain, 'utf8'), cData.final()]);
    const tagData = cData.getAuthTag();
    const lenDek = encDek.length;
    const total = 1 + 1 + this.ivLength + this.tagLength + 2 + lenDek + this.ivLength + this.tagLength + encData.length;
    const out = Buffer.allocUnsafe(total);
    let o = 0;
    out.writeUInt8(this.version, o++); // version
    out.writeUInt8(0, o++); // flags
    ivDek.copy(out, o);
    o += this.ivLength;
    tagDek.copy(out, o);
    o += this.tagLength;
    out.writeUInt16BE(lenDek, o);
    o += 2;
    encDek.copy(out, o);
    o += lenDek;
    ivData.copy(out, o);
    o += this.ivLength;
    tagData.copy(out, o);
    o += this.tagLength;
    encData.copy(out, o);
    return out.toString(this.encoding);
  }

  private decryptEnvelope(payload: string): string {
    const buf = Buffer.from(payload, this.encoding);
    let o = 0;
    const ver = buf.readUInt8(o++);
    if (ver !== this.version) {
      throw new ErrorClass({
        name: 'decryptEnvelope',
        message: `Unsupported version for: ${payload}`,
        stack: new Error().stack,
      });
    }
    o++; // flags
    const ivDek = buf.subarray(o, o + this.ivLength);
    o += this.ivLength;
    const tagDek = buf.subarray(o, o + this.tagLength);
    o += this.tagLength;
    const lenDek = buf.readUInt16BE(o);
    o += 2;
    const encDek = buf.subarray(o, o + lenDek);
    o += lenDek;
    const dDek = createDecipheriv(this.algorithm, this.kmsKey, ivDek);
    dDek.setAuthTag(tagDek);
    const dek = Buffer.concat([dDek.update(encDek), dDek.final()]);
    const ivData = buf.subarray(o, o + this.ivLength);
    o += this.ivLength;
    const tagData = buf.subarray(o, o + this.tagLength);
    o += this.tagLength;
    const encData = buf.subarray(o);
    const dData = createDecipheriv(this.algorithm, dek, ivData);
    dData.setAuthTag(tagData);
    return Buffer.concat([dData.update(encData), dData.final()]).toString('utf8');
  }
}
