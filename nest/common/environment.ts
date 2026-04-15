import { ConfigurationClass, ConfigurationType } from '@common/classes/configuration.class';

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

const EnvironmentConfig: ConfigurationType<EnvironmentInterface> = {
  app: {
    env: {
      placeholder: 'ENV',
      required: true,
    },
    debug: {
      placeholder: 'ENV',
      transform: (v: string) => v?.toLowerCase() !== 'production',
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
      required: true,
    },
    port: {
      placeholder: 'PORT',
      required: true,
      transform: ConfigurationClass.toNumber,
    },
  },
};

ConfigurationClass.loadEnv();

const configuration = new ConfigurationClass<typeof EnvironmentConfig>();
const { environments, errors } = configuration.process(EnvironmentConfig);

if (errors.length) {
  const message = `Configuration errors:\n${errors.map((e) => `- ${e}`).join('\n')}`;
  throw new Error(message);
}

export const environment = environments;
export const environmentMasked = configuration.mask(
  environments,
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
