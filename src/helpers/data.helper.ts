import { ConverterHelper } from './converter.helper';
import { ParserHelper, ParserTraceInterface } from './parser.helper';

interface EmptyOptionsInterface {
  blankString?: boolean;
  null?: boolean;
  undefined?: boolean;
  zeroNumber?: boolean;
  emptyArray?: boolean;
  emptyObject?: boolean;
}

type CallbackType = (key: string | number, value: unknown) => [string | number, unknown];

class DataSingleton {
  private static self: DataSingleton;

  private readonly isNode: boolean;

  private constructor() {
    this.isNode = !!(typeof process !== 'undefined' && process?.versions?.node);
  }

  public static getInstance(): DataSingleton {
    if (!DataSingleton.self) {
      DataSingleton.self = new DataSingleton();
    }
    return DataSingleton.self;
  }

  /**
   * CHECK FUNCTIONS
   */
  public isNull(data: unknown): boolean {
    return data === null;
  }

  public isBuffer(data: unknown): boolean {
    if (typeof Buffer === 'undefined') return false;
    return data instanceof Buffer || Buffer.isBuffer(data);
  }

  public isMongoId(data: unknown): boolean {
    return data instanceof Object ? /^[0-9a-fA-F]{24}$/.test(data.toString()) : false;
  }

  public isPrimitive(data: unknown): boolean {
    return (
      data === undefined ||
      data === null ||
      typeof data === 'string' ||
      typeof data === 'number' ||
      typeof data === 'boolean' ||
      typeof data === 'symbol' ||
      typeof data === 'bigint'
    );
  }

  public isInstance(data: unknown): boolean {
    return this.isObject(data) && Object.getPrototypeOf(data) !== Object.prototype;
  }

  public isObject(data: unknown): boolean {
    if (Array.isArray(data)) {
      return false;
    } else if (this.isMongoId(data) || data instanceof Date || data instanceof RegExp) {
      return false;
    } else if (data instanceof Map || data instanceof Set || data instanceof WeakMap || data instanceof WeakSet) {
      return false;
    } else if (this.isBuffer(data) || data instanceof Uint8Array) {
      return false;
    } else {
      return data instanceof Object;
    }
  }

  public isObjectEmpty(data: unknown | unknown[]): boolean {
    return this.isObject(data) && Object.keys(data as object).length === 0;
  }

  public isArrayEmpty(data: unknown | unknown[]): boolean {
    return Array.isArray(data) && (data as []).length === 0;
  }

  public isEmpty(data: unknown | unknown[], options?: EmptyOptionsInterface): boolean {
    if (options?.undefined && data === undefined) {
      return true;
    } else if (options?.null && data === null) {
      return true;
    } else if (options?.blankString && data === '') {
      return true;
    } else if (options?.zeroNumber && data === 0) {
      return true;
    } else if (options?.emptyObject && this.isObjectEmpty(data)) {
      return true;
    } else if (options?.emptyArray && this.isArrayEmpty(data)) {
      return true;
    }
    return false;
  }

  public isEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true;
    }
    if (typeof a !== typeof b) {
      return false;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!this.isEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    if (this.isObject(a) && this.isObject(b)) {
      const keysA = Object.keys(a as Record<string, unknown>);
      const keysB = Object.keys(b as Record<string, unknown>);
      if (keysA.length !== keysB.length) {
        return false;
      }
      for (const key of keysA) {
        if (!(key in (b as Record<string, unknown>))) {
          return false;
        }
        if (!this.isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * EXCLUDE FUNCTIONS
   */
  public excludeKeys<DATA>(data: DATA, keys: string[], recursive = false): Partial<DATA> {
    if (Array.isArray(data)) {
      return data.map((item) => {
        return this.excludeKeys(item as DATA, keys, recursive);
      }) as unknown as Partial<DATA>;
    } else if (this.isObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        if (keys.includes(key)) {
          return acc;
        }
        if (this.isObject(value) && recursive) {
          return { ...acc, [key]: this.excludeKeys(value as DATA, keys, recursive) };
        }
        return { ...acc, [key]: value };
      }, {} as Partial<DATA>);
    } else {
      return data;
    }
  }

  public excludeValues<DATA>(data: DATA, values: unknown[], recursive = false): Partial<DATA> {
    if (Array.isArray(data)) {
      return data
        .filter((item) => !values.includes(item))
        .map((item) => {
          return this.excludeValues(item as DATA, values, recursive);
        }) as unknown as Partial<DATA>;
    } else if (this.isObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        if (values.includes(value)) {
          return acc;
        }
        if (this.isObject(value) && recursive) {
          return {
            ...acc,
            [key]: this.excludeValues(value as DATA, values, recursive),
          };
        }
        return { ...acc, [key]: value };
      }, {} as Partial<DATA>);
    } else {
      return data;
    }
  }

  public excludePath(fromPath: string, excludePath = ''): string {
    const path = excludePath ? excludePath : this.isNode ? process.cwd() : '';
    if (!path) return fromPath;
    if (fromPath.startsWith(path)) {
      const rest = fromPath.slice(path.length).replace(/^\/|\/$/g, '');
      return rest || '.';
    }
    return fromPath.replace(/^\/|\/$/g, '');
  }

  public omitEmpty<DATA>(data: DATA, options: EmptyOptionsInterface = {}, recursive = true): DATA {
    if (Array.isArray(data)) {
      return data
        .map((item: DATA) => {
          return this.omitEmpty(item, options, recursive);
        })
        .filter((item) => {
          return !this.isEmpty(item, options);
        }) as DATA;
    } else if (this.isObject(data)) {
      return Object.entries(data as Record<string, DATA>).reduce((acc, [key, value]) => {
        if (this.isObject(value) || Array.isArray(value)) {
          const result = recursive ? this.omitEmpty(value, options, recursive) : value;
          if (options?.emptyObject && this.isObjectEmpty(result)) {
            return acc;
          }
          if (options?.emptyArray && this.isArrayEmpty(result)) {
            return acc;
          }
          return { ...acc, [key]: result };
        }
        if (this.isEmpty(value, options)) {
          return acc;
        }
        return { ...acc, [key]: value };
      }, {} as DATA);
    } else {
      return data;
    }
  }

  public pickEmpty<DATA>(data: DATA, options: EmptyOptionsInterface = {}, recursive = true): DATA {
    if (Array.isArray(data)) {
      const mapped = data.map((item) => this.pickEmpty(item as DATA, options, recursive));
      return mapped.filter((item) => {
        if (Array.isArray(item)) {
          // включаем массив, если он не пустой или emptyArray разрешен
          return !this.isArrayEmpty(item) || options?.emptyArray;
        }
        if (this.isObject(item)) {
          // включаем объект, если он не пустой или emptyObject разрешен
          return !this.isObjectEmpty(item) || options?.emptyObject;
        }
        // скаляры включаем только если пустые по options
        return this.isEmpty(item, options);
      }) as DATA;
    } else if (this.isObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        let v = value;
        if ((Array.isArray(value) || this.isObject(value)) && recursive) {
          v = this.pickEmpty(value as DATA, options, recursive);
        }
        if (Array.isArray(v)) {
          if (!this.isArrayEmpty(v) || options?.emptyArray) {
            return { ...acc, [key]: v };
          }
          return acc;
        }
        if (this.isObject(v)) {
          if (!this.isObjectEmpty(v) || options?.emptyObject) {
            return { ...acc, [key]: v };
          }
          return acc;
        }
        if (this.isEmpty(v, options)) {
          return { ...acc, [key]: v };
        }
        return acc; // пропускаем непустые скаляры
      }, {} as DATA);
    } else {
      return this.isEmpty(data, options) ? data : ({} as DATA);
    }
  }

  /**
   * HELPER FUNCTIONS
   */
  public applyCallback<T>(data: T, callback: CallbackType, recursive = false): T {
    if (Array.isArray(data)) {
      const result: unknown[] = [];
      for (let index = 0; index < data.length; index++) {
        const item = data[index] as T;
        const processed = recursive ? this.applyCallback(item, callback, recursive) : item;
        const [newKey, newValue] = callback(index, processed);
        result[newKey as number] = newValue;
      }
      return result as T;
    } else if (this.isObject(data)) {
      const result: Record<string | number, unknown> = {};
      for (const key of Object.keys(data as Record<string, unknown>)) {
        const value = (data as Record<string, unknown>)[key];
        const processed =
          recursive && (Array.isArray(value) || this.isObject(value))
            ? this.applyCallback(value, callback, recursive)
            : value;
        const [newKey, newValue] = callback(key, processed);
        result[newKey] = newValue;
      }
      return result as T;
    }
    return data;
  }

  public filterCircular<T>(data: T): T {
    const cache = new WeakSet();
    const walk = (item: unknown): unknown => {
      if (item instanceof Error) {
        const error = item as Error & { messageIsJson?: boolean };
        return {
          name: item.name,
          message: error.messageIsJson ? ParserHelper.json(error.message) : error.message,
          stack: this.traceListFromErrorStack(error.stack),
        };
      }
      if (!this.isObject(item)) {
        return item;
      }
      // Циклическая проверка
      if (cache.has(item as object)) {
        return '[Circular]';
      }
      cache.add(item as object);
      if (this.isInstance(item)) {
        return item;
      }
      if (Array.isArray(item)) {
        return item.map(walk);
      }
      // Объект/класс
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(item as object)) {
        result[key] = walk(value);
      }
      return result;
    };
    return walk(data) as T;
  }

  public traceListFromErrorStack(stack = ''): ParserTraceInterface[] {
    if (!stack) return [];
    const traceList = ParserHelper.stack(stack);
    const result: ParserTraceInterface[] = [];
    for (const trace of traceList) {
      const { caller, method, file } = trace;
      if (file.includes('node_modules/') || file.includes('node:') || (caller === '' && method === '')) {
        continue;
      }
      result.push({
        caller: trace.caller,
        method: trace.method,
        file: this.isNode ? DataHelper.excludePath(file, process.cwd()) : file,
      });
    }
    return result;
  }

  public keywordListFromWordList(wordList: string[]): string[] {
    if (!wordList.length) return [];
    const set = new Set<string>();
    for (const word of wordList) {
      const splitList = ConverterHelper.splitWords(word);
      if (!splitList.length) continue;
      for (const split of splitList) {
        set.add(split.toLowerCase());
      }
    }
    return Array.from(set);
  }
}

export const DataHelper = DataSingleton.getInstance();
