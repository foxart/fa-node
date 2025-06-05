import process from 'process';

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
      } else if (dictionary[key] === undefined) {
        errors.push(fullKey);
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
}

export const ConfigurationHelper = ConfigurationSingleton.getInstance();
