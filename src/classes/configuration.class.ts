import * as fs from 'fs';
import * as path from 'path';

type ConfigurationType<T> =
  T extends ConfigurationSchemaInterface<infer R>
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

interface ConfigurationSchemaInterface<T = string> {
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

  private static isReference(value: unknown): value is ConfigurationSchemaInterface {
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

  private extractRecursive(schema: Record<string, unknown>): {
    configuration: Record<string, unknown>;
    errors: string[];
  } {
    const result: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const key in schema) {
      const value = schema[key];
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
}
