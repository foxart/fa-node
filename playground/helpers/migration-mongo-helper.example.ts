import { ConverterHelper } from '../../src';

export function run(): void {
  void import('../../src/cli/migration-mongo.cli').then((module) => {
    const upperToSeparator = 'create-expires-At-expireAfter-sec_onds-index-in-log';
    console.log(
      ConverterHelper.tokenizeWords.name,
      upperToSeparator,
      ConverterHelper.tokenizeWords(upperToSeparator, '-'),
    );
  });
}
