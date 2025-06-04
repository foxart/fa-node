import { ConverterHelper } from '../../src';

export function run(): void {
  void import('../../src/helpers/migration-mongo.helper').then((module) => {
    const separatorToCamel = 'lorem_ipsum_dolorSit-Amet';
    console.log(
      ConverterHelper.separatorToCamel.name,
      separatorToCamel,
      ConverterHelper.separatorToCamel(separatorToCamel, '_'),
    );
    const separatorToPascal = '_lorem_ip___sum_dolorSit-Amet';
    console.log(
      ConverterHelper.separatorToPascal.name,
      separatorToPascal,
      ConverterHelper.separatorToPascal(separatorToPascal, '_'),
    );
    const lowerToSeparator = 'lorem___ipsum_dolorSit-amet';
    console.log(
      ConverterHelper.lowerToSeparator.name,
      lowerToSeparator,
      ConverterHelper.lowerToSeparator(lowerToSeparator, '_'),
    );
    const upperToSeparator = 'create-expires-At-expireAfter-sec_onds-index-in-log';
    console.log(
      ConverterHelper.upperToSeparator.name,
      upperToSeparator,
      ConverterHelper.upperToSeparator(upperToSeparator, '-'),
    );
  });
}
