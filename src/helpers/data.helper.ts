import { CheckHelper } from './check.helper';
import { ConverterHelper } from './converter.helper';

export interface StackToTraceInterface {
  file: string;
  caller: string;
  method: string | undefined;
}

interface EmptyOptionsInterface {
  blankString?: boolean;
  null?: boolean;
  undefined?: boolean;
  zeroNumber?: boolean;
  emptyArray?: boolean;
  emptyObject?: boolean;
}

interface MergeDeepOptionsInterface {
  null?: boolean;
  undefined?: boolean;
  array?: boolean;
}

type ApplyCallbackType = (key: string | number, value: unknown) => [string | number, unknown];

class DataSingleton {
  private static self: DataSingleton;
  private readonly stackRegExp = new RegExp('^ *at\\s+(.*?)\\s*\\(?(\\S+:\\d+:\\d+)\\)?', 'gm');
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
   * EXCLUDE FUNCTIONS
   */
  public excludeKeys<DATA>(data: DATA, keys: string[], recursive = false): Partial<DATA> {
    if (Array.isArray(data)) {
      return data.map((item) => {
        return this.excludeKeys(item as DATA, keys, recursive);
      }) as unknown as Partial<DATA>;
    } else if (CheckHelper.isObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        if (keys.includes(key)) {
          return acc;
        }
        if (CheckHelper.isObject(value) && recursive) {
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
    } else if (CheckHelper.isObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        if (values.includes(value)) {
          return acc;
        }
        if (CheckHelper.isObject(value) && recursive) {
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
    if (!path) {
      return fromPath;
    }
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
          return !CheckHelper.isEmpty(item, options);
        }) as DATA;
    } else if (CheckHelper.isObject(data)) {
      return Object.entries(data as Record<string, DATA>).reduce((acc, [key, value]) => {
        if (CheckHelper.isObject(value) || Array.isArray(value)) {
          const result = recursive ? this.omitEmpty(value, options, recursive) : value;
          if (options?.emptyObject && CheckHelper.isObjectEmpty(result)) {
            return acc;
          }
          if (options?.emptyArray && CheckHelper.isArrayEmpty(result)) {
            return acc;
          }
          return { ...acc, [key]: result };
        }
        if (CheckHelper.isEmpty(value, options)) {
          return acc;
        }
        return { ...acc, [key]: value };
      }, {} as DATA);
    } else {
      return data;
    }
  }

  // todo add filter empty object
  public mergeDeep<T extends object, S extends object>(
    target: T,
    source: S,
    options: MergeDeepOptionsInterface = { null: true, undefined: false, array: false },
  ): T & S {
    const result = Array.isArray(target) ? ([...target] as unknown) : ({ ...target } as unknown);
    const out = result as Record<string, unknown>;
    for (const key in source) {
      const srcValue = source[key];
      if (!options.null && srcValue === null) {
        continue;
      }
      if (!options.undefined && srcValue === undefined) {
        continue;
      }
      const resultValue = out[key];
      if (Array.isArray(srcValue) && Array.isArray(resultValue)) {
        out[key] = options.array ? ([...(resultValue as unknown[]), ...(srcValue as unknown[])] as unknown) : srcValue;
        continue;
      }
      if (CheckHelper.isObject(srcValue) && CheckHelper.isObject(resultValue)) {
        out[key] = this.mergeDeep(resultValue as object, srcValue as object, options);
        continue;
      }
      out[key] = srcValue;
    }
    return result as T & S;
  }

  public pickEmpty<DATA>(data: DATA, options: EmptyOptionsInterface = {}, recursive = true): DATA {
    if (Array.isArray(data)) {
      const mapped = data.map((item) => this.pickEmpty(item as DATA, options, recursive));
      return mapped.filter((item) => {
        if (Array.isArray(item)) {
          // включаем массив, если он не пустой или emptyArray разрешен
          return !CheckHelper.isArrayEmpty(item) || options?.emptyArray;
        }
        if (CheckHelper.isObject(item)) {
          // включаем объект, если он не пустой или emptyObject разрешен
          return !CheckHelper.isObjectEmpty(item) || options?.emptyObject;
        }
        // скаляры включаем только если пустые по options
        return CheckHelper.isEmpty(item, options);
      }) as DATA;
    } else if (CheckHelper.isObject(data)) {
      return Object.entries(data as Record<string, unknown>).reduce((acc, [key, value]) => {
        let v = value;
        if ((Array.isArray(value) || CheckHelper.isObject(value)) && recursive) {
          v = this.pickEmpty(value as DATA, options, recursive);
        }
        if (Array.isArray(v)) {
          if (!CheckHelper.isArrayEmpty(v) || options?.emptyArray) {
            return { ...acc, [key]: v };
          }
          return acc;
        }
        if (CheckHelper.isObject(v)) {
          if (!CheckHelper.isObjectEmpty(v) || options?.emptyObject) {
            return { ...acc, [key]: v };
          }
          return acc;
        }
        if (CheckHelper.isEmpty(v, options)) {
          return { ...acc, [key]: v };
        }
        return acc; // пропускаем непустые скаляры
      }, {} as DATA);
    } else {
      return CheckHelper.isEmpty(data, options) ? data : ({} as DATA);
    }
  }

  /**
   * HELPER FUNCTIONS
   */
  public applyCallback<T>(data: T, callback: ApplyCallbackType, recursive = false): T {
    if (Array.isArray(data)) {
      const result: unknown[] = [];
      for (let index = 0; index < data.length; index++) {
        const item = data[index] as T;
        const processed = recursive ? this.applyCallback(item, callback, recursive) : item;
        const [newKey, newValue] = callback(index, processed);
        result[newKey as number] = newValue;
      }
      return result as T;
    } else if (CheckHelper.isObject(data)) {
      const result: Record<string | number, unknown> = {};
      for (const key of Object.keys(data as Record<string, unknown>)) {
        const value = (data as Record<string, unknown>)[key];
        const processed =
          recursive && (Array.isArray(value) || CheckHelper.isObject(value))
            ? this.applyCallback(value, callback, recursive)
            : value;
        const [newKey, newValue] = callback(key, processed);
        result[newKey] = newValue;
      }
      return result as T;
    }
    return data;
  }

  public filterCircular(data: unknown): unknown {
    const cache = new WeakSet();
    const walk = (item: unknown): unknown => {
      if (item instanceof Error) {
        return {
          name: item.name,
          message: this.isJsonError(item) ? this.jsonParse(item.message) : item.message,
          stack: this.stackToTrace(item.stack),
        };
      }
      if (item === null || typeof item !== 'object') {
        return item;
      }
      if (cache.has(item)) {
        return '[Circular]';
      }
      cache.add(item);
      if (Array.isArray(item)) {
        const arr = new Array(item.length);
        for (let i = 0; i < item.length; i++) {
          arr[i] = walk(item[i]);
        }
        return arr;
      }
      const proto = Object.getPrototypeOf(item) as object;
      if (proto !== Object.prototype && proto !== null) {
        return item;
      }
      const result: Record<string, unknown> = {};
      for (const key in item as Record<string, unknown>) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          result[key] = walk((item as Record<string, unknown>)[key]);
        }
      }
      return result;
    };
    return walk(data);
  }

  public stackToTrace(stack = '', filterNode = false): StackToTraceInterface[] {
    if (!stack) {
      return [];
    }
    const stackRegExp = new RegExp(this.stackRegExp.source, 'gm');
    const result: StackToTraceInterface[] = [];
    for (const match of stack.matchAll(stackRegExp)) {
      const context = match[1];
      const dotIndex = context.indexOf('.');
      const caller = dotIndex === -1 ? context : context.slice(0, dotIndex);
      const method = dotIndex === -1 ? undefined : context.slice(dotIndex + 1);
      let file = match[2];
      if (
        filterNode &&
        (file.includes('node_modules') || file.startsWith('node:internal') || (caller === '' && method === ''))
      ) {
        continue;
      }
      if (filterNode && this.isNode) {
        file = DataHelper.excludePath(file, process.cwd());
      }
      result.push({ caller, method, file });
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

  private jsonParse<T>(data: string): T | string {
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      return data;
    }
  }

  private isJsonError(error: Error): boolean {
    return Boolean((error as { messageIsJson?: boolean }).messageIsJson);
  }
}

export const DataHelper = DataSingleton.getInstance();
