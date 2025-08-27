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

  public isInstanceObject(data: unknown): boolean {
    return this.isPlainObject(data) && Object.getPrototypeOf(data) !== Object.prototype;
  }

  public isEmptyObject(data: unknown): boolean {
    return this.isPlainObject(data) && Object.keys(data as object).length === 0;
  }

  public isEmptyArray(data: unknown): boolean {
    return Array.isArray(data) && data.length === 0;
  }

  public isPlainObject(data: unknown): boolean {
    if (Array.isArray(data)) {
      return false;
    } else if (data instanceof Date) {
      return false;
    } else if (data instanceof RegExp) {
      return false;
    } else if (data instanceof Object) {
      /** Check for mongoId instance */
      return !data.toString().match(/^[0-9a-fA-F]{24}$/);
    } else {
      return data instanceof Object && data.constructor === Object;
    }
  }

  public isPrimitive(data: unknown): boolean {
    return (
      data === undefined ||
      data === null ||
      typeof data === 'string' ||
      typeof data === 'number' ||
      typeof data === 'boolean' ||
      typeof data === 'symbol' ||
      typeof data === 'bigint' ||
      Buffer.isBuffer(data)
    );
  }

  public isEmpty(data: unknown, options?: IsEmptyKeyValueInterface): boolean {
    if (options?.undefined && data === undefined) {
      return true;
    } else if (options?.nullValue && data === null) {
      return true;
    } else if (options?.emptyString && data === '') {
      return true;
    } else if (options?.zeroNumber && data === 0) {
      return true;
    } else if (options?.emptyObject && this.isPlainObject(data)) {
      return this.isEmptyObject(data);
    } else if (options?.emptyArray && Array.isArray(data)) {
      return data.length === 0;
    }
    return false;
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
    } else if (this.isPlainObject(data)) {
      return Object.entries(data as Record<string, DATA>).reduce((acc, [key, value]) => {
        if (this.isPlainObject(value) || Array.isArray(value)) {
          const result = recursive ? this.filterEmpty(value, options, recursive) : value;
          if (options?.object?.emptyObject && this.isEmptyObject(result)) {
            return acc;
          }
          if (options?.array?.emptyArray && this.isEmptyArray(result)) {
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
    } else if (this.isPlainObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        if (this.isPlainObject(value) && recursive) {
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
    } else if (this.isPlainObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        if (keys.includes(key)) {
          return acc;
        }
        if (this.isPlainObject(value) && recursive) {
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
    } else if (this.isPlainObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        if (values.includes(value)) {
          return acc;
        }
        if (this.isPlainObject(value) && recursive) {
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

  public fromJson(data: string): unknown | undefined {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}

export const DataHelper = DataSingleton.getInstance();
