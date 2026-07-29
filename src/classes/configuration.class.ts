import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

type EnvironmentDictionary = Record<string, string | undefined>;

export type ConfigurationType<T> = ConfigurationDefinition<T, EnvironmentDictionary>;

type ConfigurationDefinition<T, TEnvironment extends object, TPlaceholder extends string = string> = [T] extends [
  readonly (infer U)[],
]
  ? ConfigurationDefinition<U, TEnvironment, TPlaceholder>[]
  : [T] extends [object]
    ? { [K in keyof T]: ConfigurationDefinition<T[K], TEnvironment, TPlaceholder> }
    : EnvironmentValue<T, TEnvironment, TPlaceholder>;

type EnvironmentValue<T, TEnvironment extends object, TPlaceholder extends string> =
  | {
      placeholder: TPlaceholder;
      transform: (value: string | undefined, environment: Readonly<TEnvironment>) => T;
      default?: never;
    }
  | {
      placeholder: TPlaceholder;
      transform?: never;
      default: T;
    }
  | (T extends string ? { placeholder: TPlaceholder; transform?: never; default?: never } : never);

type ConfigurationFactory<TConfiguration extends object> = <const TPlaceholder extends string>(
  configuration: ConfigurationDefinition<TConfiguration, Partial<Record<TPlaceholder, string>>, TPlaceholder>,
) => ConfigurationDefinition<TConfiguration, Partial<Record<TPlaceholder, string>>, TPlaceholder>;

interface DictionaryInterface {
  placeholder: string;
  default?: unknown;
  transform?: (value: string | undefined, environment: Readonly<EnvironmentDictionary>) => unknown;
}

export class ConfigurationClass<TConfiguration extends object = object> {
  public constructor(filePath = '.env') {
    this.loadEnv(filePath);
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

  public static define<TConfiguration extends object>(): ConfigurationFactory<TConfiguration> {
    return (configuration) => {
      return configuration;
    };
  }

  public load(configuration: ConfigurationType<TConfiguration>): TConfiguration {
    const { environments, errors } = this.extractRecursive(configuration as Record<string, unknown>);
    if (errors.length) {
      throw new Error(`Configuration errors:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    }
    return environments as TConfiguration;
  }

  private loadEnv(filePath: string): void {
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

  private isReference(value: unknown): value is DictionaryInterface {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const ref = value as { placeholder?: unknown };
    return typeof ref.placeholder === 'string';
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
      if (this.isReference(value)) {
        const { placeholder, default: def, transform } = value;
        if (!placeholder) {
          errors.push(`${valuePath} (placeholder is empty)`);
          continue;
        }
        const rawValue = process.env[placeholder];
        const raw = rawValue !== undefined && rawValue !== '' ? String(rawValue).replace(/\r$/, '') : undefined;
        if (transform) {
          try {
            result[key] = transform(raw, process.env);
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
