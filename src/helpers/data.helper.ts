import { ParserHelper } from './parser.helper';
// interface IsEmptyKeyValueInterface {
//   undefined?: boolean;
//   nullValue?: boolean;
//   emptyString?: boolean;
//   zeroNumber?: boolean;
//   emptyArray?: boolean;
//   emptyObject?: boolean;
// }

interface EmptyOptionsInterface {
  undefined?: boolean;
  nullValue?: boolean;
  emptyString?: boolean;
  zeroNumber?: boolean;
  emptyArray?: boolean;
  emptyObject?: boolean;
}

type MapCallback = (key: string, value: unknown) => unknown;

class DataSingleton {
  private static self: DataSingleton;

  private readonly characters = [
    Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 65)).join(''),
    Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 97)).join(''),
    Array.from({ length: 10 }, (_, i) => i).join(''),
  ].join('');

  private readonly colorList = [
    '#A47864',
    '#C9B27C',
    '#DCCCBD',
    '#EDE3D9',
    '#F1E3BC',
    '#31231A',
    '#52361E',
    '#9E7967',
    '#EDEAB1',
    '#512C3A',
    '#71ADBA',
    '#FF654F',
    '#4C5578',
    '#B2456E',
    '#FBEAE7',
    '#552619',
    '#EDF4F2',
    '#7C8363',
    '#31473A',
    '#E9E0D4',
    '#B8CCD0',
    '#6C767E',
    '#56615D',
    '#E5DADA',
    '#FFF2EF',
    '#FFDBB6',
    '#F7A5A5',
    '#D3DAD9',
    '#715A5A',
    '#44444E',
  ];

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

  /**
   * CONVERT FUNCTIONS
   */
  public convertFromJson<T>(data: string): T | string {
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      return data;
    }
  }

  public convertToJson(data: unknown, indent?: number): string {
    const cache: unknown[] = [];
    return JSON.stringify(
      data,
      (_key, value: unknown) => {
        return typeof value === 'object' && value !== null
          ? cache.includes(value)
            ? '[Converting circular structure to JSON]'
            : cache.push(value) && value
          : value;
      },
      indent ?? 2,
    );
  }

  public convertHexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    let r: number, g: number, b: number;
    if (clean.length === 6) {
      r = parseInt(clean.slice(0, 2), 16);
      g = parseInt(clean.slice(2, 4), 16);
      b = parseInt(clean.slice(4, 6), 16);
    } else {
      r = 0;
      g = 0;
      b = 0;
    }
    return [r, g, b];
  }

  public convertRgbToHex(r: number, g: number, b: number): string {
    const to2 = (n: number): string => {
      const h = n.toString(16);
      return h.length === 1 ? '0' + h : h;
    };
    return `#${to2(r)}${to2(g)}${to2(b)}`;
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

  public excludePath(path: string, exclude: string): string {
    if (path.startsWith(exclude)) {
      const cleanedPath = path.replace(exclude, '').replace(/^\/|\/$/g, '');
      return cleanedPath || '.';
    }
    return path.replace(/^\/|\/$/g, '');
  }

  /**
   * HELPER FUNCTIONS
   */
  public applyCallback<DATA>(data: DATA, callback: MapCallback, recursive = false): DATA {
    if (Array.isArray(data)) {
      return data.map((item: DATA) => {
        return this.applyCallback(item, callback, recursive);
      }) as DATA;
    } else if (this.isObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        if (this.isObject(value) && recursive) {
          return { ...acc, [key]: recursive ? this.applyCallback(value, callback, recursive) : value };
        }
        return { ...acc, [key]: callback(key, value) };
      }, {} as DATA);
    } else {
      return data;
    }
  }

  public filterCircular(data: unknown, excludePath = ''): unknown {
    const cache = new WeakSet();
    const walk = (item: unknown): unknown => {
      if (item instanceof Error) {
        const stack = ParserHelper.parseStack(item.stack)
          .filter((trace) => {
            return !trace.file.includes('node_modules/') && !trace.file.includes('node:');
          })
          .map((trace) => {
            return {
              ...trace,
              file: excludePath ? DataHelper.excludePath(trace.file, excludePath) : trace.file,
            };
          });
        const errorClass = item as Error & { messageIsJson?: boolean };
        return {
          // __className: item.constructor.name,
          name: item.name,
          message: errorClass.messageIsJson ? DataHelper.convertFromJson(errorClass.message) : errorClass.message,
          stack,
        };
      }
      if (!this.isObject(item)) {
        return item;
      }
      // Циклическая проверка
      if (cache.has(item as object)) {
        return '[CIRCULAR]';
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
      // if (
      //   (item as object).constructor &&
      //   (item as object).constructor.name &&
      //   (item as object).constructor.name !== 'Object'
      // ) {
      //   result.__className = (item as object).constructor.name;
      // }
      for (const [key, value] of Object.entries(item as object)) {
        result[key] = walk(value);
      }
      return result;
    };
    return walk(data);
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
   * RANDOM FUNCTIONS
   */
  public randomBoolean(): boolean {
    return Math.random() < 0.5;
  }

  public randomFloat(min: number, max: number): number {
    return Math.random() * (max - min + 1) + min;
  }

  public randomColor(delta = 20): string {
    const random = (base: number): number => {
      const shift = this.randomInteger(-delta, delta);
      const v = base + shift;
      return Math.max(0, Math.min(255, v));
    };
    const base = this.colorList[this.randomInteger(0, this.colorList.length - 1)];
    const [r, g, b] = this.convertHexToRgb(base);
    return this.convertRgbToHex(random(r), random(g), random(b));
  }

  public randomInteger(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  public randomDate(startDate: Date, endDate: Date): Date {
    // function isLeapYear(year: number): boolean {
    //   return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    // }
    // const year = this.randomInteger(startYear, endYear);
    // const month = this.randomInteger(0, 11);
    // const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // const day = this.randomInteger(1, daysInMonth[month]);
    // const hour = this.randomInteger(0, 23);
    // const minute = this.randomInteger(0, 59);
    // const second = this.randomInteger(0, 59);
    // return new Date(year, month, day, hour, minute, second);
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const randomMs = this.randomInteger(startMs, endMs);
    return new Date(randomMs);
  }

  public randomString(length = 10): string {
    let counter = 0;
    let result = '';
    while (counter < length) {
      result += this.characters.charAt(Math.floor(Math.random() * this.characters.length));
      counter++;
    }
    return result;
  }

  public randomWord(length = 5): string {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'z'];
    let word = '';
    let useVowel = Math.random() > 0.5;
    for (let i = 0; i < length; i++) {
      const letters = useVowel ? vowels : consonants;
      const randomChar = letters[Math.floor(Math.random() * letters.length)];
      word += randomChar;
      useVowel = !useVowel;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}

export const DataHelper = DataSingleton.getInstance();
