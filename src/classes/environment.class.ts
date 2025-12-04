import { IoHelper } from '../helpers/io.helper';

interface EnvironmentInterface<T> {
  configuration: T;
  errors: string[];
}

export class EnvironmentClass<T> {
  private readonly configuration: T;

  public constructor(configuration: T) {
    this.configuration = configuration;
  }

  public load(filePath = '.env'): void {
    try {
      if (!IoHelper.checkPath(filePath)) {
        return;
      }
      const raw = IoHelper.readFileSync(filePath, 'utf8') as string;
      if (!raw) {
        return;
      }
      raw.split('\n').forEach((line: string) => {
        const clean = line.trim();
        if (!clean || clean.startsWith('#')) return;
        const eqIndex = clean.indexOf('=');
        if (eqIndex === -1) return;
        const key = clean.slice(0, eqIndex).trim();
        let value = clean.slice(eqIndex + 1).trim();
        // Убираем кавычки
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        // Поддержка ${OTHER_ENV}
        value = value.replace(/\$\{([A-Z0-9_]+)}/g, (_, varName: string) => {
          return process.env[varName] ?? '';
        });
        // Не перезаписывать существующие переменные окружения
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  public extract(): EnvironmentInterface<T> {
    return this.extractRecursive(this.configuration);
  }

  public mask(fullList: string[], partialList: string[]): T {
    return this.maskRecursive(this.configuration, fullList, partialList);
  }

  private extractRecursive(dictionary: T, parentKey = ''): EnvironmentInterface<T> {
    const result: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const key in dictionary) {
      const fullKey = parentKey ? parentKey + '.' + key : key;
      // Рекурсивный объект
      if (typeof dictionary[key] === 'object' && dictionary[key] !== null) {
        const nested = this.extractRecursive(dictionary[key] as T, fullKey);
        result[key] = nested.configuration;
        errors.push(...nested.errors);
        continue;
      }
      // Новый синтаксис: `$ENV_VAR`
      if (typeof dictionary[key] === 'string' && /^\$[A-Z0-9_]+$/.test(dictionary[key])) {
        const envKey = dictionary[key].slice(1); // убираем $
        if (process.env[envKey] !== undefined) {
          result[key] = process.env[envKey];
        } else {
          errors.push(envKey);
        }
        continue;
      }
      // Иначе — обычное значение
      result[key] = dictionary[key];
    }

    return { configuration: result as T, errors };
  }

  private maskRecursive(obj: T, fullList: string[], partialList: string[]): T {
    if (!obj || typeof obj !== 'object') return obj;
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      const value = obj[key];
      // Nested object or array
      if (typeof value === 'object' && value !== null) {
        result[key] = this.maskRecursive(value as T, fullList, partialList);
        continue;
      }
      const lowerKey = key.toLowerCase();
      const str = value?.toString?.() || '';
      // FULL MASK
      if (fullList.some((maskKey) => lowerKey.includes(maskKey))) {
        result[key] = str.replace(/[A-Za-z0-9]/g, '*');
        continue;
      }
      // PARTIAL MASK
      if (partialList.some((maskKey) => lowerKey.includes(maskKey))) {
        const prefixLength = 3;
        const suffixLength = 3;
        if (str.length <= prefixLength + suffixLength) {
          const first = str[0] || '';
          const last = str.length > 1 ? str[str.length - 1] : '';
          const middle = str.length > 2 ? str.slice(1, -1).replace(/[A-Za-z0-9]/g, '*') : '';
          result[key] = first + middle + last;
        } else {
          const prefix = str.slice(0, prefixLength);
          const suffix = str.slice(-suffixLength);
          const middle = str.slice(prefixLength, -suffixLength).replace(/[A-Za-z0-9]/g, '*');
          result[key] = prefix + middle + suffix;
        }
        continue;
      }
      // No mask
      result[key] = value;
    }
    return result as T;
  }
}
