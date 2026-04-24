const ENV = process.env.NODE_ENV || '';

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

const normalizedEnv = envMap[ENV] || EnvEnum.LOCAL;

export const isDevMode = () => normalizedEnv === EnvEnum.LOCAL || normalizedEnv === EnvEnum.DEVELOPMENT;
export const isProdMode = () => normalizedEnv === EnvEnum.PRODUCTION;
export const isStageMode = () => normalizedEnv === EnvEnum.STAGING;
export const isTestMode = () => normalizedEnv === EnvEnum.TEST;
