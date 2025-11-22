import { ConverterHelper } from '../../src';

export function run(): void {
  void import('../../src/helpers/migration-mongo.helper').then((module) => {
    const upperToSeparator = 'create-expires-At-expireAfter-sec_onds-index-in-log';
    console.log(
      ConverterHelper.separateWords.name,
      upperToSeparator,
      ConverterHelper.separateWords(upperToSeparator, '-'),
    );
  });
}
