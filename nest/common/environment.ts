import { ConfigurationClass } from '../../src';

interface EnvironmentInterface {
  app: {
    env: string;
    debug: boolean;
    version: string;
    protocol: string;
    host: string;
    port: number;
  };
}

const env = ConfigurationClass.define<EnvironmentInterface>()({
  app: {
    env: {
      placeholder: 'ENV',
    },
    debug: {
      placeholder: 'DEBUG',
      transform: (value, environment) => {
        if (environment.ENV) {
          return environment.ENV.toLowerCase() === 'production';
        }
        return ConfigurationClass.toBoolean(value);
      },
    },
    version: {
      placeholder: 'VERSION',
      default: '1.0',
    },
    protocol: {
      placeholder: 'PROTOCOL',
      default: 'http',
    },
    host: {
      placeholder: 'HOST',
    },
    port: {
      placeholder: 'PORT',
      transform: (value) => {
        return value ? ConfigurationClass.toIntPositive(value) : 3000;
      },
    },
  },
});

export const environment = new ConfigurationClass<EnvironmentInterface>().load(env);
