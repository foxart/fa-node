import {
  AnsiHelper,
  CheckHelper,
  ConfigurationClass,
  CryptClass,
  DecoratorClass,
  ErrorClass,
  LoggerClass,
  LoggerNest,
  LoggerNode,
  MigrationMongoCli,
} from './index';

describe('package entrypoint', () => {
  it('should expose the public package surface', () => {
    expect(ConfigurationClass).toBeDefined();
    expect(CryptClass).toBeDefined();
    expect(DecoratorClass).toBeDefined();
    expect(ErrorClass).toBeDefined();
    expect(MigrationMongoCli).toBeDefined();
    expect(AnsiHelper).toBeDefined();
    expect(CheckHelper).toBeDefined();
    expect(LoggerClass).toBeDefined();
    expect(LoggerNest).toBeDefined();
    expect(LoggerNode).toBeDefined();
  });
});
