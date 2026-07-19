import * as FaNode from './index';

describe('package entrypoint', () => {
  it('should expose the public package surface', () => {
    expect(Object.keys(FaNode)).toEqual(
      expect.arrayContaining([
        'ConfigurationClass',
        'CryptClass',
        'DecoratorClass',
        'ErrorClass',
        'MigrationMongoCli',
        'AnsiHelper',
        'CheckHelper',
        'LoggerClass',
        'LoggerNest',
        'LoggerNode',
      ]),
    );
  });
});
