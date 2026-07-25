import { ConfigurationClass, ConfigurationType } from '../../src';

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

const Configurations: ConfigurationType<EnvironmentInterface> = {
  app: {
    env: {
      placeholder: 'ENV',
    },
    debug: {
      placeholder: 'ENV',
      transform: (value) => {
        return value?.toLowerCase() !== 'production';
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
};

const ConfigurationHelper = new ConfigurationClass();
const configuration = ConfigurationHelper.apply(Configurations);

export const environment = configuration;
export const environmentMasked = ConfigurationHelper.mask(
  configuration,
  [
    'host',
    'password',
    'port',
    'user',
    //
  ],
  [
    'version',
    //
  ],
);
