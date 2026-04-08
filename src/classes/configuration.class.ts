import * as fs from 'fs';
import * as path from 'path';

type ConfigurationType<T> =
  T extends ConfigurationDicrionaryInterface<infer R>
    ? R
    : T extends readonly (infer U)[]
      ? readonly ConfigurationType<U>[]
      : T extends object
        ? { readonly [K in keyof T]: ConfigurationType<T[K]> }
        : T;

interface ConfigurationResultInterface<T> {
  configuration: ConfigurationType<T>;
  errors: string[];
}

interface ConfigurationDicrionaryInterface<T = string> {
  placeholder: string;
  default?: T;
  required?: boolean;
  transform?: (value: string) => T;
}

type ConfigurationSchemaBase<T> = {
  placeholder: string;
  transform?: (value: string) => T;
};

type ConfigurationSchemaRequired<T> = ConfigurationSchemaBase<T> & {
  required: true;
  default?: never;
};

type ConfigurationSchemaWithDefault<T> = ConfigurationSchemaBase<T> & {
  default: T;
  required?: false;
};

type ConfigurationSchemaOptional<T> = ConfigurationSchemaBase<T> & {
  required?: false;
  default?: undefined;
};

export type ConfigurationInterface<T = string> =
  | ConfigurationSchemaRequired<T>
  | ConfigurationSchemaWithDefault<T>
  | ConfigurationSchemaOptional<T>;

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

  public static toNumber(this: void, value: string): number {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      throw new Error(`Invalid number: ${value}`);
    }
    return n;
  }

  public static toBoolean(this: void, value: string): boolean {
    const v = value.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'off'].includes(v)) return false;
    throw new Error(`Invalid boolean: ${value}`);
  }

  private static isReference(value: unknown): value is ConfigurationDicrionaryInterface {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const ref = value as { placeholder?: unknown };
    return typeof ref.placeholder === 'string';
  }

  public extract(schema: T): ConfigurationResultInterface<T> {
    const { configuration, errors } = this.extractRecursive(schema as Record<string, unknown>);
    return {
      configuration: configuration as ConfigurationType<T>,
      errors,
    };
  }

  public mask(configuration: ConfigurationType<T>, fullList: string[], partialList: string[]): ConfigurationType<T> {
    return this.maskRecursive(configuration as Record<string, unknown>, fullList, partialList) as ConfigurationType<T>;
  }

  private extractRecursive(dictionary: Record<string, unknown>): {
    configuration: Record<string, unknown>;
    errors: string[];
  } {
    const result: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const key in dictionary) {
      const value = dictionary[key];
      if (ConfigurationClass.isReference(value)) {
        const { placeholder, default: def, required = false, transform } = value;
        if (!placeholder) continue;
        const rawValue = process.env[placeholder];
        if (rawValue !== undefined && rawValue !== '') {
          try {
            // ✅ trim CR just in case env came with \r
            const raw = String(rawValue).replace(/\r$/, '');
            result[key] = transform ? transform(raw) : raw;
          } catch {
            errors.push(`${placeholder} (transform failed)`);
          }
        } else if (def !== undefined) {
          // ✅ apply transform to default too (keeps types; avoids mismatch env/default)
          try {
            result[key] = transform ? transform(String(def)) : def;
          } catch {
            errors.push(`${placeholder} (default transform failed)`);
          }
        } else if (required) {
          errors.push(placeholder);
        }
        continue;
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = this.extractRecursive(value as Record<string, unknown>);
        result[key] = nested.configuration;
        errors.push(...nested.errors);
        continue;
      }
      result[key] = value;
    }
    return { configuration: result, errors };
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
