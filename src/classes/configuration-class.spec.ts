import { ConfigurationClass, ConfigurationType } from '../index';

describe('ConfigurationClass', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    delete process.env.REQUIRED_KEY;
    delete process.env.DEFAULT_KEY;
    delete process.env.NUMERIC_KEY;
  });

  afterAll(() => {
    process.env = envBackup;
  });

  it('should add an error when env key is missing and no default is provided', () => {
    const configuration = new ConfigurationClass<{
      requiredValue: {
        placeholder: string;
      };
    }>();

    const result = configuration.process({
      requiredValue: {
        placeholder: 'REQUIRED_KEY',
      },
    } satisfies ConfigurationType<{ requiredValue: string }>);

    expect(result.environments.requiredValue).toBeUndefined();
    expect(result.errors).toStrictEqual(['REQUIRED_KEY']);
  });

  it('should use default when env key is missing', () => {
    const configuration = new ConfigurationClass<{
      optionalValue: {
        placeholder: string;
        default: string;
      };
    }>();

    const result = configuration.process({
      optionalValue: {
        placeholder: 'DEFAULT_KEY',
        default: 'fallback',
      },
    } satisfies ConfigurationType<{ optionalValue: string }>);

    expect(result.environments.optionalValue).toBe('fallback');
    expect(result.errors).toStrictEqual([]);
  });

  it('should transform default value when env key is missing', () => {
    const configuration = new ConfigurationClass<{
      numericValue: {
        placeholder: string;
        default: number;
        transform: (value: string) => number;
      };
    }>();

    const result = configuration.process({
      numericValue: {
        placeholder: 'NUMERIC_KEY',
        default: 42,
        transform: ConfigurationClass.toNumber,
      },
    } satisfies ConfigurationType<{ numericValue: number }>);

    expect(result.environments.numericValue).toBe(42);
    expect(result.errors).toStrictEqual([]);
  });
});
