import bcrypt from 'bcryptjs';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';
import { v4, V4Options } from 'uuid';
import { ErrorClass } from './error.class';

// type WordArray = CryptoJS.lib.WordArray;
export class CryptClass {
  private readonly algorithm = 'aes-256-cbc';

  private readonly encoding = 'base64';

  public constructor(private readonly _secret: string) {}

  public get secret(): string {
    return this._secret;
  }

  public encrypt<T>(data: T, throws = true): T {
    if (!data) {
      return data;
    }
    try {
      // const iv = crypto.randomBytes(16);
      // const key = crypto.scryptSync(secret, 'salt', 32);
      // const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      // let encrypted = cipher.update(data, 'utf8', 'base64');
      // encrypted += cipher.final('base64');
      // return iv.toString('base64') + ':' + encrypted;
      const key = createHash('sha256').update(this._secret).digest();
      const iv = Buffer.from(Array(16).fill(0));
      const cipher = createCipheriv(this.algorithm, key, iv);
      let encrypted = cipher.update(data as string, 'utf8', this.encoding);
      encrypted += cipher.final(this.encoding);
      return encrypted as T;
    } catch (e) {
      const error = e as Error;
      if (throws) {
        throw error;
      } else {
        console.error(
          new ErrorClass({
            name: `${this.constructor.name} ${this.encrypt.name}: ${data.toString() || data.constructor.name}`,
            message: error.message,
            stack: error.stack,
          }),
        );
      }
      return data;
    }
  }

  public decrypt<T>(data: T, throws = true): T {
    if (!data) {
      return data;
    }
    try {
      // const [ivString, encryptedData] = data.split(':');
      // const iv = Buffer.from(ivString, 'base64');
      // const key = crypto.scryptSync(secret, 'salt', 32);
      // const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      // let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      // decrypted += decipher.final('utf8');
      // return decrypted;
      const key = createHash('sha256').update(this._secret).digest();
      const iv = Buffer.from(Array(16).fill(0));
      const decipher = createDecipheriv(this.algorithm, key, iv);
      let decrypted = decipher.update(data as string, this.encoding, 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted as T;
    } catch (e) {
      const error = e as Error;
      if (throws) {
        throw error;
      } else {
        console.error(
          new ErrorClass({
            name: `${this.constructor.name} ${this.decrypt.name}: ${data.toString() || data.constructor.name}`,
            message: error.message,
            stack: error.stack,
          }),
        );
      }
      return data;
    }
  }

  public md5(message: string, key?: string): string {
    if (key) {
      return createHmac('md5', key).update(message).digest('hex');
    }
    return createHash('md5').update(message).digest('hex');
  }

  public random(nBytes = 16): string {
    // return CryptoJS.lib.WordArray.random(nBytes ? nBytes : 16).toString();
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
