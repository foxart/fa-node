interface IsEmptyKeyValueInterface {
  undefined?: boolean;
  nullValue?: boolean;
  emptyString?: boolean;
  zeroNumber?: boolean;
  emptyArray?: boolean;
  emptyObject?: boolean;
}

interface FilterEmptyInterface {
  array?: IsEmptyKeyValueInterface;
  object?: IsEmptyKeyValueInterface;
}

type MapCallback = (key: string, value: unknown) => unknown;

class DataSingleton {
  private static self: DataSingleton;

  private readonly characters: string;

  private constructor() {
    const upper = Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 65)).join('');
    const lower = Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 97)).join('');
    const numbers = Array.from({ length: 10 }, (_, i) => i).join('');
    this.characters = [upper, lower, numbers].join('');
  }

  public static getInstance(): DataSingleton {
    if (!DataSingleton.self) {
      DataSingleton.self = new DataSingleton();
    }
    return DataSingleton.self;
  }

  public randomFloat(min: number, max: number): number {
    return Math.random() * (max - min + 1) + min;
  }

  public randomInteger(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  public randomString(length: number): string {
    let counter = 0;
    let result = '';
    while (counter < length) {
      result += this.characters.charAt(Math.floor(Math.random() * this.characters.length));
      counter++;
    }
    return result;
  }

  public isBuffer(data: unknown): boolean {
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
    if (this.isArray(data)) {
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

  public isArray(data: unknown | unknown[]): boolean {
    return Array.isArray(data);
  }

  public isArrayEmpty(data: unknown | unknown[]): boolean {
    return this.isArray(data) && (data as []).length === 0;
  }
  public isEmpty(data: unknown | unknown[], options?: IsEmptyKeyValueInterface): boolean {
    if (options?.undefined && data === undefined) {
      return true;
    } else if (options?.nullValue && data === null) {
      return true;
    } else if (options?.emptyString && data === '') {
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
  public isValidationFree(data: unknown | unknown[]): boolean {
    return this.isArray(data)
      ? (data as []).some((item) => {
          return !this.isInstance(item) && !this.isObject(item);
        })
      : !this.isInstance(data) && !this.isObject(data);
  }

  public filterEmpty<DATA>(
    data: DATA,
    options: FilterEmptyInterface = { array: { undefined: true }, object: { undefined: true } },
    recursive = true,
  ): DATA {
    if (Array.isArray(data)) {
      return data
        .map((item: DATA) => {
          return this.filterEmpty(item, options, recursive);
        })
        .filter((item) => {
          return !this.isEmpty(item, options?.array);
        }) as DATA;
    } else if (this.isObject(data)) {
      return Object.entries(data as Record<string, DATA>).reduce((acc, [key, value]) => {
        if (this.isObject(value) || this.isArray(value)) {
          const result = recursive ? this.filterEmpty(value, options, recursive) : value;
          if (options?.object?.emptyObject && this.isObjectEmpty(result)) {
            return acc;
          }
          if (options?.array?.emptyArray && this.isArrayEmpty(result)) {
            return acc;
          }
          return { ...acc, [key]: result };
        }
        if (this.isEmpty(value, options?.object)) {
          return acc;
        }
        return { ...acc, [key]: value };
      }, {} as DATA);
    } else {
      return data;
    }
  }

  public mapCallback<DATA>(data: DATA, callback: MapCallback, recursive = false): DATA {
    if (Array.isArray(data)) {
      return data.map((item: DATA) => {
        return this.mapCallback(item, callback, recursive);
      }) as DATA;
    } else if (this.isObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        if (this.isObject(value) && recursive) {
          return { ...acc, [key]: recursive ? this.mapCallback(value, callback, recursive) : value };
        }
        return { ...acc, [key]: callback(key, value) };
      }, {} as DATA);
    } else {
      return data;
    }
  }

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

  public toJson(data: unknown, indent?: number): string {
    const cache: unknown[] = [];
    return JSON.stringify(
      data,
      (_key, value: unknown) =>
        typeof value === 'object' && value !== null
          ? cache.includes(value)
            ? '[CIRCULAR]'
            : cache.push(value) && value
          : value,
      indent ?? 2,
    );
  }

  // public toJson(data: unknown, indent?: number): string {
  //   const cache: unknown[] = [];
  //   const parseStrings = (value: unknown): unknown => {
  //     if (typeof value === 'string') {
  //       try {
  //         const parsed = JSON.parse(value) as unknown;
  //         if (typeof parsed === 'object' && parsed !== null) {
  //           return parseStrings(parsed);
  //         }
  //         return value; // число, строка, булеан — оставим как есть
  //       } catch {
  //         return value; // невалидный JSON — оставим как есть
  //       }
  //     } else if (Array.isArray(value)) {
  //       return value.map(parseStrings);
  //     } else if (typeof value === 'object' && value !== null) {
  //       const result: Record<string, unknown> = {};
  //       for (const [k, v] of Object.entries(value)) {
  //         result[k] = parseStrings(v);
  //       }
  //       return result;
  //     }
  //     return value; // примитивы
  //   };
  //   const processed = parseStrings(data);
  //   return JSON.stringify(
  //     processed,
  //     (_key, value: unknown) => {
  //       if (typeof value === 'object' && value !== null) {
  //         if (cache.includes(value)) {
  //           return '[CIRCULAR]';
  //         }
  //         cache.push(value);
  //       }
  //       return value;
  //     },
  //     indent ?? 2,
  //   );
  // }

  public fromJson<T>(data: string): T | string {
    // if (typeof data === 'string') {
    // } else {
    //   return data as T;
    // }
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      return data;
    }
  }
}

export const DataHelper = DataSingleton.getInstance();
