enum EnvEnum {
  LOCAL = 'local',
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

const envMap: Record<string, EnvEnum> = {
  local: EnvEnum.LOCAL,
  development: EnvEnum.DEVELOPMENT,
  dev: EnvEnum.DEVELOPMENT,
  staging: EnvEnum.STAGING,
  stage: EnvEnum.STAGING,
  production: EnvEnum.PRODUCTION,
  prod: EnvEnum.PRODUCTION,
  test: EnvEnum.TEST,
} as const;

const getNormalizedEnv = (): EnvEnum => {
  const environment = process.env.NODE_ENV;
  if (!environment) {
    return EnvEnum.LOCAL;
  }

  const normalizedEnv = envMap[environment.toLowerCase()];
  if (!normalizedEnv) {
    throw new Error(`Invalid NODE_ENV: ${environment}`);
  }
  return normalizedEnv;
};

export const isDevMode = (): boolean => {
  const environment = getNormalizedEnv();
  return environment === EnvEnum.LOCAL || environment === EnvEnum.DEVELOPMENT;
};
export const isProdMode = (): boolean => getNormalizedEnv() === EnvEnum.PRODUCTION;
export const isStageMode = (): boolean => getNormalizedEnv() === EnvEnum.STAGING;
export const isTestMode = (): boolean => getNormalizedEnv() === EnvEnum.TEST;
