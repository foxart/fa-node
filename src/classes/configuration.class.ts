import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export type ConfigurationType<T> = [T] extends [readonly (infer U)[]]
  ? ConfigurationType<U>[]
  : [T] extends [object]
    ? { [K in keyof T]: ConfigurationType<T[K]> }
    : EnvironmentValue<T>;

type EnvironmentValue<T> =
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

interface DictionaryInterface {
  placeholder: string;
  default?: unknown;
  transform?: (value: string | undefined) => unknown;
}

export class ConfigurationClass<TConfiguration extends object = object> {
  public constructor(filePath = '.env') {
    ConfigurationClass.loadEnv(filePath);
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

  private static loadEnv(filePath: string): void {
    const absPath = resolve(filePath);
    if (!existsSync(absPath)) return;
    const raw = readFileSync(absPath, 'utf8');
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

  private static isReference(value: unknown): value is DictionaryInterface {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const ref = value as { placeholder?: unknown };
    return typeof ref.placeholder === 'string';
  }

  public apply(configuration: ConfigurationType<TConfiguration>): TConfiguration {
    const { environments, errors } = this.extractRecursive(configuration as Record<string, unknown>);
    if (errors.length) {
      throw new Error(`Configuration errors:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    }
    return environments as TConfiguration;
  }

  public mask(dictionary: TConfiguration, fullList: string[], partialList: string[]): TConfiguration {
    const result: Record<string, unknown> = {};
    for (const key in dictionary) {
      const value = dictionary[key];
      if (Array.isArray(value)) {
        result[key] = value;
        continue;
      }
      if (typeof value === 'object' && value !== null) {
        result[key] = this.mask(value as TConfiguration, fullList, partialList);
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
    return result as TConfiguration;
  }

  private extractRecursive(
    dictionary: Record<string, unknown>,
    path = '',
  ): {
    environments: Record<string, unknown>;
    errors: string[];
  } {
    const result: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const key in dictionary) {
      const value = dictionary[key];
      const valuePath = path ? `${path}.${key}` : key;
      if (ConfigurationClass.isReference(value)) {
        const { placeholder, default: def, transform } = value;
        if (!placeholder) {
          errors.push(`${valuePath} (placeholder is empty)`);
          continue;
        }
        const rawValue = process.env[placeholder];
        const raw = rawValue !== undefined && rawValue !== '' ? String(rawValue).replace(/\r$/, '') : undefined;
        if (transform) {
          try {
            result[key] = transform(raw);
          } catch {
            errors.push(`${valuePath}: ${placeholder} (transform failed)`);
          }
        } else if (raw !== undefined) {
          result[key] = raw;
        } else if (def !== undefined) {
          result[key] = def;
        } else {
          errors.push(`${valuePath}: ${placeholder}`);
        }
        continue;
      }
      if (Array.isArray(value)) {
        const nested = this.extractArray(value, valuePath);
        result[key] = nested.environments;
        errors.push(...nested.errors);
        continue;
      }
      if (typeof value === 'object' && value !== null) {
        const nested = this.extractRecursive(value as Record<string, unknown>, valuePath);
        result[key] = nested.environments;
        errors.push(...nested.errors);
        continue;
      }
      errors.push(`${valuePath} (literal values are not supported)`);
    }
    return { environments: result, errors };
  }

  private extractArray(
    values: unknown[],
    path: string,
  ): {
    environments: unknown[];
    errors: string[];
  } {
    const environments: unknown[] = [];
    const errors: string[] = [];
    for (const [index, value] of values.entries()) {
      const key = String(index);
      const nested = this.extractRecursive({ [key]: value }, path);
      if (key in nested.environments) {
        environments.push(nested.environments[key]);
      }
      errors.push(...nested.errors);
    }
    return { environments, errors };
  }
}
