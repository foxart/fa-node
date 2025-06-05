import process from 'process';
import { ConfigurationHelper } from '../../src';

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
  console.log(result.result);
}
