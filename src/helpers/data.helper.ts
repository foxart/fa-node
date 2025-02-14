export interface FilterOptionsInterface {
  undefined?: boolean;
  nullValue?: boolean;
  emptyArray?: boolean;
  emptyObject?: boolean;
  emptyString?: boolean;
  zeroNumber?: boolean;
  exclude?: string[];
  recursive?: boolean;
}

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

  public filter<Data>(data: Data, options: FilterOptionsInterface & { only?: Array<keyof Data> }): Data {
    const isEmpty = (data: unknown, options?: FilterOptionsInterface & { only?: Array<keyof Data> }): boolean => {
      // options?.only;
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
    };
    /**
     *
     */
    if (Array.isArray(data)) {
      return data
        .map((item: Data) => {
          return this.filter(item, options);
        })
        .filter((item) => {
          return !isEmpty(item, {
            ...options,
            nullValue: false,
            zeroNumber: false,
            emptyString: false,
          });
        }) as Data;
    } else if (this.isPlainObject(data)) {
      return Object.entries(data as Record<keyof Data, Data>).reduce((acc, [key, value]) => {
        if (options.exclude?.includes(key)) {
          return acc;
        } else if (this.isPlainObject(value)) {
          const result = options.recursive ? this.filter(value as Data, options) : value;
          if (options.only && !options.only.includes(key as keyof Data)) {
            return { ...acc, [key]: result };
          }
          return isEmpty(result, options) ? acc : { ...acc, [key]: result };
        } else {
          if (options.only && !options.only.includes(key as keyof Data)) {
            return { ...acc, [key]: value };
          }
          return isEmpty(value, options) ? acc : { ...acc, [key]: value };
        }
      }, {} as Data);
    } else {
      return data;
    }
  }
}

export const DataHelper = DataSingleton.getInstance();
