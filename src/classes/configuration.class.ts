import * as fs from 'fs';
import * as path from 'path';

export type ConfigurationType<T> = {
  [K in keyof T]: T[K] extends object ? ConfigurationType<T[K]> : ConfigurationInterface<T[K]> | T[K];
};

type ConfigurationInterface<T = string> =
  | {
      placeholder: string;
      transform: (value: string | undefined) => T;
      default?: never;
    }
  | {
      placeholder: string;
      transform?: never;
      default: T;
    }
  | (T extends string ? { placeholder: string; transform?: never; default?: never } : never);

type DictionaryType<T> = T extends { transform: (...args: never[]) => infer R }
  ? R
  : T extends { default: infer R }
    ? R
    : T extends { placeholder: string }
      ? string
      : T extends readonly (infer U)[]
        ? readonly DictionaryType<U>[]
        : T extends object
          ? { readonly [K in keyof T]: DictionaryType<T[K]> }
          : T;

interface ResultInterface<T> {
  environments: DictionaryType<T>;
  errors: string[];
}

interface DictionaryInterface {
  placeholder: string;
  default?: unknown;
  transform?: (value: string | undefined) => unknown;
}

export class ConfigurationClass<T extends object> {
  public static loadEnv(filePath = '.env'): void {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) return;
    const raw = fs.readFileSync(absPath, 'utf8');
    if (!raw) return;
    raw.split(/\r?\n/).forEach((line) => {
      const clean = line.trim();
      if (!clean || clean.startsWith('#')) return;
      const eqIndex = clean.indexOf('=');
      if (eqIndex === -1) return;
      const key = clean.slice(0, eqIndex).trim();
      let value = clean.slice(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      value = value.replace(/\r$/, '');
      value = value.replace(/\$\{([A-Z0-9_]+)}/g, (_: string, envKey: string) => {
        return process.env[String(envKey)] ?? '';
      });
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value;
      }
    });
  }

  public static toFloat(this: void, value?: string): number {
    if (value === undefined) {
      throw new Error(`Float not set`);
    }
    const result = Number(value);
    if (!Number.isFinite(result)) {
      throw new Error(`Invalid float: ${value}`);
    }
    return result;
  }

  public static toFloatPositive(this: void, value?: string): number {
    if (value === undefined) {
      throw new Error(`Positive float not set`);
    }
    return Math.abs(ConfigurationClass.toFloat(value));
  }

  public static toInt(this: void, value?: string): number {
    if (value === undefined) {
      throw new Error(`Integer not set`);
    }
    const result = Number(value);
    if (!Number.isInteger(result)) {
      throw new Error(`Invalid integer: ${value}`);
    }
    return result;
  }

  public static toIntPositive(this: void, value?: string): number {
    if (value === undefined) {
      throw new Error(`Positive integer not set`);
    }
    return Math.abs(ConfigurationClass.toInt(value));
  }

  public static toBoolean(this: void, value?: string): boolean {
    if (value === undefined) {
      throw new Error(`Boolean not set`);
    }
    const result = value.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(result)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(result)) {
      return false;
    }
    throw new Error(`Invalid boolean: ${value}`);
  }

  private static isReference(value: unknown): value is DictionaryInterface {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const ref = value as { placeholder?: unknown };
    return typeof ref.placeholder === 'string';
  }

  public process(configuration: T): ResultInterface<T> {
    const { environments, errors } = this.extractRecursive(configuration as Record<string, unknown>);
    return {
      environments: environments as DictionaryType<T>,
      errors,
    };
  }

  public mask(dictionary: DictionaryType<T>, fullList: string[], partialList: string[]): DictionaryType<T> {
    return this.maskRecursive(dictionary as Record<string, unknown>, fullList, partialList) as DictionaryType<T>;
  }

  private extractRecursive(dictionary: Record<string, unknown>): {
    environments: Record<string, unknown>;
    errors: string[];
  } {
    const result: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const key in dictionary) {
      const value = dictionary[key];
      if (ConfigurationClass.isReference(value)) {
        const { placeholder, default: def, transform } = value;
        if (!placeholder) continue;
        const rawValue = process.env[placeholder];
        const raw = rawValue !== undefined && rawValue !== '' ? String(rawValue).replace(/\r$/, '') : undefined;
        if (transform) {
          try {
            result[key] = transform(raw);
          } catch {
            errors.push(`${placeholder} (transform failed)`);
          }
        } else if (raw !== undefined) {
          result[key] = raw;
        } else if (def !== undefined) {
          result[key] = def;
        } else {
          errors.push(placeholder);
        }
        continue;
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = this.extractRecursive(value as Record<string, unknown>);
        result[key] = nested.environments;
        errors.push(...nested.errors);
        continue;
      }
      result[key] = value;
    }
    return { environments: result, errors };
  }

  private maskRecursive(
    dictionary: Record<string, unknown>,
    fullList: string[],
    partialList: string[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in dictionary) {
      const value = dictionary[key];
      if (Array.isArray(value)) {
        result[key] = value;
        continue;
      }
      if (typeof value === 'object' && value !== null) {
        result[key] = this.maskRecursive(value as Record<string, unknown>, fullList, partialList);
        continue;
      }
      const str = value?.toString?.() ?? '';
      const lowerKey = key.toLowerCase();
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
          const first = str[0] ?? '';
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
      result[key] = value;
    }
    return result;
  }
}
