import process from 'process';
import { ConfigurationHelper, ConsoleLevelEnum, ConsoleNestClass, ErrorClass } from '../../src';

export function run(): void {
  console.clear();
  process.env.VALUE = 'value';
  const configuration = {
    key1: {
      key12: '<VALUE>',
    },
  };
  const result = ConfigurationHelper.extract(configuration);
  console.error(result.errors);
  console.log(new Error('Error'));
  console.log(new ErrorClass({ name: 'ErrorString', message: 'Message' }));
  console.log(new ErrorClass({ name: 'ErrorObject', message: ['123', { a: 1 }] }));
  const nestConsole = new ConsoleNestClass({
    color: true,
    info: true,
    performance: true,
    link: true,
    hidden: true,
    stackError: true,
    stackDebug: true,
  });
  nestConsole.output(
    ConsoleLevelEnum.LOG,
    { caller: '', file: '', method: '' },
    new ErrorClass({
      name: 'ErrorString',
      message: { a: '123' },
    }),
  );
}
