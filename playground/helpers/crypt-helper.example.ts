import { CryptClass, SystemHelper } from '../../src';

type KeyRecord = { keyId: string; kmsKey: Buffer; hmacKey: Buffer };
type KeyCatalog = {
  current: KeyRecord;
  byId: Map<string, KeyRecord>;
};

function buildKeyCatalog(): KeyCatalog {
  // В реальности — тяните ключи из KMS/Vault. Здесь — заглушка из .env/randomBytes.
  const k1: KeyRecord = {
    keyId: '2024-12-k1',
    kmsKey: Buffer.from('23e748f8c90312023c1093d4be2ab6c7b1122a6a8aaef7dabb6e6be0c354ed0a', 'hex'),
    hmacKey: Buffer.from('b4dc86b3f104bbe70d2fe427e9f3d1a03728f2b8a3f920542bf1f74533afa884', 'hex'),
  };
  const k2: KeyRecord = {
    keyId: '2025-01-k2', // текущий active
    kmsKey: Buffer.from('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'hex'),
    hmacKey: Buffer.from('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'hex'),
  };
  const byId = new Map<string, KeyRecord>([
    [k1.keyId, k1],
    [k2.keyId, k2],
  ]);
  return { current: k2, byId };
}

function wrapCryptWithKeyCatalog(cryptFactory: (kmsKey: Buffer, hmacKey: Buffer) => CryptClass): {
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
} {
  const catalog = buildKeyCatalog();
  const VERSION = 1; // 1 байт

  // Кеш CryptClass по keyId
  const instanceCache = new Map<string, CryptClass>();

  function getCryptForKeyId(keyId: string, kmsKey: Buffer, hmacKey: Buffer): CryptClass {
    const cached = instanceCache.get(keyId);
    if (cached) {
      return cached;
    }
    // Создаём один экземпляр и кешируем
    const inst = cryptFactory(kmsKey, hmacKey);
    instanceCache.set(keyId, inst);
    return inst;
  }

  return {
    encrypt(value: string): string {
      const { keyId, kmsKey, hmacKey } = catalog.current;
      // получаем кешированный экземпляр (не создаём новый)
      const crypt = getCryptForKeyId(keyId, kmsKey, hmacKey);
      // crypt.encrypt сейчас должен возвращать base64/строку payload
      const payload = crypt.encrypt(value)!;
      const keyIdBuf = Buffer.from(keyId, 'utf8');
      const header = Buffer.alloc(2);
      header.writeUInt8(VERSION, 0);
      header.writeUInt8(keyIdBuf.length, 1);
      const result = Buffer.concat([header, keyIdBuf, Buffer.from(payload, 'utf8')]);
      return result.toString('base64url');
    },

    decrypt(packed: string): string {
      const buf = Buffer.from(packed, 'base64url');
      let offset = 0;
      const version = buf.readUInt8(offset);
      offset += 1;
      if (version !== VERSION) {
        throw new Error(`Unsupported version: ${version}`);
      }
      const keyIdLen = buf.readUInt8(offset);
      offset += 1;
      const keyId = buf.subarray(offset, offset + keyIdLen).toString('utf8');
      offset += keyIdLen;
      const record = catalog.byId.get(keyId);
      if (!record) {
        throw new Error(`Unknown keyId: ${keyId}`);
      }
      const innerBase64 = buf.subarray(offset).toString('utf8');
      // используем кешированный экземпляр
      const crypt = getCryptForKeyId(keyId, record.kmsKey, record.hmacKey);
      return crypt.decrypt(innerBase64)!;
    },
  };
}

export function run(): void {
  // Фабрика создает CryptClass из сырых ключей (а не из коротких строк)
  const cryptApi = wrapCryptWithKeyCatalog((kmsKey, hmacKey) => {
    // Предполагается, что CryptClass может принимать сырой ключ.
    // Если сейчас он принимает строки-секреты и хэширует их — доработайте конструктор под Buffer.
    // Временный адаптер: передаем hex-строки, внутри останется совместимость.
    return new CryptClass(kmsKey, hmacKey);
  });
  const cryptClass = new CryptClass(
    Buffer.from('5c89ae3ebef3d3f80293a07e03f0deb5dc04448ff0c1db1d436053eb84d1349b', 'hex'),
    // 'XXX',
    Buffer.from('65bbaa86259247d42ece703d673bd36a7c29a4f455c1e8470b19dadd74255c60', 'hex'),
  );
  //
  const data = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  //
  let encryptedWithApi;
  let decryptedWithApi;
  SystemHelper.timeStart('api');
  for (let i = 0; i < 10000; i++) {
    encryptedWithApi = cryptApi.encrypt(data);
    decryptedWithApi = cryptApi.decrypt(encryptedWithApi);
  }
  const timeApi = SystemHelper.timeEnd('api');
  //
  let encryptedWithClass;
  let decryptedWithClass;
  SystemHelper.timeStart('class');
  for (let i = 0; i < 10000; i++) {
    encryptedWithClass = cryptClass.encrypt(data);
    decryptedWithClass = cryptClass.decrypt(encryptedWithClass);
  }
  const timeClass = SystemHelper.timeEnd('class');
  //
  console.log({ encryptedWithApi, decryptedWithApi, timeApi });
  console.log({ encryptedWithClass, decryptedWithClass, timeClass });
}
