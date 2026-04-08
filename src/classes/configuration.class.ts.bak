import { IoHelper } from '../helpers/io.helper';

interface EnvironmentInterface<T> {
  configuration: T;
  errors: string[];
}

export class ConfigurationClass<T extends object> {
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
    // return this.extractRecursive(this.configuration);
    const { configuration, errors } = this.extractRecursive(this.configuration as Record<string, unknown>);
    return {
      configuration: configuration as T,
      errors,
    };
  }

  public mask(configuration: T, fullList: string[], partialList: string[]): EnvironmentInterface<T> {
    return this.maskRecursive(
      configuration as Record<string, unknown>,
      fullList,
      partialList,
    ) as unknown as EnvironmentInterface<T>;
  }

  private extractRecursive(
    dictionary: Record<string, unknown>,
    parentKey = '',
  ): EnvironmentInterface<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const key in dictionary) {
      const fullKey = parentKey ? parentKey + '.' + key : key;
      if (Array.isArray(dictionary[key])) {
        result[key] = dictionary[key];
        continue;
      }
      // Рекурсивный объект
      if (typeof dictionary[key] === 'object' && dictionary[key] !== null) {
        const nested = this.extractRecursive(dictionary[key] as Record<string, unknown>, fullKey);
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

    return { configuration: result, errors };
  }

  private maskRecursive(
    dictionary: Record<string, unknown>,
    fullList: string[],
    partialList: string[],
  ): Record<string, unknown> {
    if (!dictionary || typeof dictionary !== 'object') return dictionary;
    const result: Record<string, unknown> = {};
    for (const key in dictionary) {
      const value = dictionary[key];
      if (Array.isArray(dictionary[key])) {
        result[key] = dictionary[key];
        continue;
      }
      // Nested object or array
      if (typeof value === 'object' && value !== null) {
        result[key] = this.maskRecursive(value as Record<string, unknown>, fullList, partialList);
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
    return result;
  }
}
