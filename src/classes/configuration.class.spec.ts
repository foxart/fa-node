import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigurationClass, ConfigurationType } from './configuration.class';

describe('ConfigurationClass', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterAll(() => {
    process.env = envBackup;
  });

  describe('constructor', () => {
    let temporaryDirectory: string;

    beforeEach(() => {
      temporaryDirectory = mkdtempSync(join(tmpdir(), 'fa-node-configuration-'));
    });

    afterEach(() => {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('should ignore a missing or empty env file', () => {
      const missingFile = join(temporaryDirectory, 'missing.env');
      const emptyFile = join(temporaryDirectory, 'empty.env');
      writeFileSync(emptyFile, '');

      expect(() => new ConfigurationClass(missingFile)).not.toThrow();
      expect(() => new ConfigurationClass(emptyFile)).not.toThrow();
    });

    it('should load .env by default', () => {
      const originalDirectory = process.cwd();
      writeFileSync(join(temporaryDirectory, '.env'), 'DEFAULT_PATH_VALUE=loaded');

      try {
        process.chdir(temporaryDirectory);
        new ConfigurationClass();
      } finally {
        process.chdir(originalDirectory);
      }

      expect(process.env.DEFAULT_PATH_VALUE).toBe('loaded');
    });

    it('should parse env values, quotes, comments, and interpolation', () => {
      process.env.PRESERVED_VALUE = 'existing';
      process.env.REPLACED_VALUE = '';
      process.env.INTERPOLATION_SOURCE = 'source';
      delete process.env.MISSING_INTERPOLATION_SOURCE;

      const file = join(temporaryDirectory, 'configuration.env');
      writeFileSync(
        file,
        [
          '',
          '  # comment',
          'INVALID_LINE',
          'PLAIN_VALUE=plain',
          'DOUBLE_QUOTED_VALUE="double quoted"',
          "SINGLE_QUOTED_VALUE='single quoted'",
          'PRESERVED_VALUE=file',
          'REPLACED_VALUE=replaced',
          'INTERPOLATED_VALUE=${INTERPOLATION_SOURCE}-suffix',
          'MISSING_INTERPOLATED_VALUE=${MISSING_INTERPOLATION_SOURCE}-suffix',
        ].join('\n'),
      );

      new ConfigurationClass(file);

      expect(process.env.PLAIN_VALUE).toBe('plain');
      expect(process.env.DOUBLE_QUOTED_VALUE).toBe('double quoted');
      expect(process.env.SINGLE_QUOTED_VALUE).toBe('single quoted');
      expect(process.env.PRESERVED_VALUE).toBe('existing');
      expect(process.env.REPLACED_VALUE).toBe('replaced');
      expect(process.env.INTERPOLATED_VALUE).toBe('source-suffix');
      expect(process.env.MISSING_INTERPOLATED_VALUE).toBe('-suffix');
    });
  });

  describe('numeric transforms', () => {
    it('should transform a finite float', () => {
      expect(ConfigurationClass.toFloat('12.5')).toBe(12.5);
      expect(() => ConfigurationClass.toFloat()).toThrow('Float not set');
      expect(() => ConfigurationClass.toFloat('invalid')).toThrow('Invalid float: invalid');
    });

    it('should transform a positive float', () => {
      expect(ConfigurationClass.toFloatPositive('0.5')).toBe(0.5);
      expect(ConfigurationClass.toFloatPositive('0')).toBe(0);
      expect(ConfigurationClass.toFloatPositive('-0.5')).toBe(0.5);
      expect(() => ConfigurationClass.toFloatPositive()).toThrow('Positive float not set');
      expect(() => ConfigurationClass.toFloatPositive('invalid')).toThrow('Invalid float: invalid');
    });

    it('should transform an integer', () => {
      expect(ConfigurationClass.toInt('12')).toBe(12);
      expect(() => ConfigurationClass.toInt()).toThrow('Integer not set');
      expect(() => ConfigurationClass.toInt('12.5')).toThrow('Invalid integer: 12.5');
    });

    it('should transform a positive integer', () => {
      expect(ConfigurationClass.toIntPositive('12')).toBe(12);
      expect(ConfigurationClass.toIntPositive('0')).toBe(0);
      expect(ConfigurationClass.toIntPositive('-1')).toBe(1);
      expect(() => ConfigurationClass.toIntPositive()).toThrow('Positive integer not set');
      expect(() => ConfigurationClass.toIntPositive('1.5')).toThrow('Invalid integer: 1.5');
    });
  });

  describe('toBoolean', () => {
    it.each(['true', 'TRUE', '1', 'yes', 'on'])('should transform %s to true', (value) => {
      expect(ConfigurationClass.toBoolean(value)).toBe(true);
    });

    it.each(['false', 'FALSE', '0', 'no', 'off'])('should transform %s to false', (value) => {
      expect(ConfigurationClass.toBoolean(value)).toBe(false);
    });

    it('should reject missing and invalid values', () => {
      expect(() => ConfigurationClass.toBoolean()).toThrow('Boolean not set');
      expect(() => ConfigurationClass.toBoolean('sometimes')).toThrow('Invalid boolean: sometimes');
    });
  });

  describe('process', () => {
    it('should reject a missing required value', () => {
      delete process.env.REQUIRED_KEY;
      const configuration = {
        requiredValue: {
          placeholder: 'REQUIRED_KEY',
        },
      } satisfies ConfigurationType<{ requiredValue: string }>;

      expect(() => new ConfigurationClass().apply(configuration)).toThrow('Configuration errors:\n- REQUIRED_KEY');
    });

    it('should preserve string and numeric defaults', () => {
      delete process.env.STRING_DEFAULT_KEY;
      process.env.NUMERIC_DEFAULT_KEY = '';
      const configuration = {
        stringValue: {
          placeholder: 'STRING_DEFAULT_KEY',
          default: 'fallback',
        },
        numericValue: {
          placeholder: 'NUMERIC_DEFAULT_KEY',
          default: 3000,
        },
      } satisfies ConfigurationType<{ stringValue: string; numericValue: number }>;

      const result = new ConfigurationClass().apply(configuration);

      expect(result).toStrictEqual({
        stringValue: 'fallback',
        numericValue: 3000,
      });
    });

    it('should use and normalize a raw env value without a transform', () => {
      process.env.RAW_KEY = 'raw-value\r';
      const configuration = {
        rawValue: {
          placeholder: 'RAW_KEY',
        },
      } satisfies ConfigurationType<{ rawValue: string }>;

      const result = new ConfigurationClass().apply(configuration);

      expect(result.rawValue).toBe('raw-value');
    });

    it('should pass present and missing env values to transforms', () => {
      process.env.PRESENT_FLOAT_KEY = '12.5';
      delete process.env.MISSING_FLOAT_KEY;
      const missingTransform = jest.fn((value?: string) => {
        return value === undefined ? 42 : ConfigurationClass.toFloat(value);
      });
      const configuration = {
        presentValue: {
          placeholder: 'PRESENT_FLOAT_KEY',
          transform: ConfigurationClass.toFloat,
        },
        missingValue: {
          placeholder: 'MISSING_FLOAT_KEY',
          transform: missingTransform,
        },
      } satisfies ConfigurationType<{ presentValue: number; missingValue: number }>;

      const result = new ConfigurationClass().apply(configuration);

      expect(result).toStrictEqual({
        presentValue: 12.5,
        missingValue: 42,
      });
      expect(missingTransform).toHaveBeenCalledWith(undefined);
    });

    it('should reject transform failures', () => {
      process.env.INVALID_INT_KEY = '1.5';
      delete process.env.MISSING_INT_KEY;
      const configuration = {
        invalidValue: {
          placeholder: 'INVALID_INT_KEY',
          transform: ConfigurationClass.toInt,
        },
        missingValue: {
          placeholder: 'MISSING_INT_KEY',
          transform: ConfigurationClass.toInt,
        },
      } satisfies ConfigurationType<{ invalidValue: number; missingValue: number }>;

      expect(() => new ConfigurationClass().apply(configuration)).toThrow(
        'Configuration errors:\n- INVALID_INT_KEY (transform failed)\n- MISSING_INT_KEY (transform failed)',
      );
    });

    it('should recursively process nested values and preserve literals and arrays', () => {
      process.env.NESTED_REQUIRED_KEY = 'nested-value';
      const values = ['first', 'second'];
      const configuration = {
        nested: {
          requiredValue: {
            placeholder: 'NESTED_REQUIRED_KEY',
          },
          literalValue: 10,
        },
        values,
        emptyPlaceholder: {
          placeholder: '',
        },
        nonStringPlaceholder: {
          placeholder: 10,
        },
        nullValue: null,
      };

      const result = new ConfigurationClass().apply(configuration);

      expect(result).toStrictEqual({
        nested: {
          requiredValue: 'nested-value',
          literalValue: 10,
        },
        values,
        nonStringPlaceholder: {
          placeholder: 10,
        },
        nullValue: null,
      });
      expect(result.values).toBe(values);
    });
  });

  describe('mask', () => {
    it('should fully and partially mask matching nested values', () => {
      const values = ['visible'];
      const dictionary = {
        nested: {
          apiToken: 'Ab-12',
          shortOne: 'A',
          shortTwo: 'AB',
          shortValue: 'Ab12',
          longValue: 'abcDEF123xyz',
          emptyValue: null,
          untouched: 42,
        },
        values,
      };
      const configuration = new ConfigurationClass<typeof dictionary>();

      const result = configuration.mask(dictionary, ['token'], ['short', 'long', 'empty']);

      expect(result).toStrictEqual({
        nested: {
          apiToken: '**-**',
          shortOne: 'A',
          shortTwo: 'AB',
          shortValue: 'A**2',
          longValue: 'abc******xyz',
          emptyValue: '',
          untouched: 42,
        },
        values,
      });
      expect(result.values).toBe(values);
    });
  });
});
