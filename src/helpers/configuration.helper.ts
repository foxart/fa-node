import { DataHelper } from './data.helper';

interface ConfigurationInterface<T> {
  result: T;
  errors: string[];
}

class ConfigurationSingleton {
  private static self: ConfigurationSingleton;

  public static getInstance(): ConfigurationSingleton {
    if (!ConfigurationSingleton.self) {
      ConfigurationSingleton.self = new ConfigurationSingleton();
    }
    return ConfigurationSingleton.self;
  }

  public extract<T>(dictionary: T, parentKey = ''): ConfigurationInterface<T> {
    const result: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const key in dictionary) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof dictionary[key] === 'object' && dictionary[key] !== null) {
        const nested = this.extract(dictionary[key], fullKey);
        result[key] = nested.result;
        errors.push(...nested.errors);
        // } else if (dictionary[key] === undefined) {
        //   errors.push(fullKey);
      } else if (typeof dictionary[key] === 'string' && /^<.*>$/.test(dictionary[key])) {
        const match = dictionary[key].match(/^<(.*)>$/);
        if (match && process.env[match[1]] !== undefined) {
          result[key] = process.env[match[1]];
        } else {
          errors.push(match && match[1] ? match[1] : fullKey);
        }
      } else {
        result[key] = dictionary[key];
      }
    }
    return { result: result as T, errors };
  }

  public mask<T>(environment: T, fullList: string[], partialList: string[]): T {
    return DataHelper.applyCallback(
      environment,
      (key, value) => {
        if (DataHelper.isObject(value) || Array.isArray(value)) {
          return [key, value];
        }
        const str = value?.toString() || '';
        const lowerKey = key.toString().toLowerCase();
        if (fullList.some((maskKey) => lowerKey.includes(maskKey))) {
          const masked = str.replace(/[a-zA-Z0-9]/g, '*');
          return [key, masked];
        }
        if (partialList.some((maskKey) => lowerKey.includes(maskKey))) {
          const prefixLength = 3;
          const suffixLength = 3;
          let masked: string;
          if (str.length <= prefixLength + suffixLength) {
            const first = str.charAt(0);
            const last = str.length > 1 ? str.charAt(str.length - 1) : '';
            const middle = str.length > 2 ? str.slice(1, -1).replace(/[a-zA-Z0-9]/g, '*') : '';
            masked = first + middle + last;
          } else {
            const prefix = str.slice(0, prefixLength);
            const suffix = str.slice(-suffixLength);
            const middle = str.slice(prefixLength, -suffixLength).replace(/[a-zA-Z0-9]/g, '*');
            masked = prefix + middle + suffix;
          }
          return [key, masked];
        }
        return [key, value];
      },
      true,
    );
  }
}

export const ConfigurationHelper = ConfigurationSingleton.getInstance();
