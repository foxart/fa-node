import { ConverterHelper } from '../../src';

export function run(): void {
  void import('../../src/helpers/migrate-mongo.helper').then((module) => {
    // const separatorToCamel = '_lorem_ipsum_dolorSit-Amet';
    // console.log(ConverterHelper.separatorToCamel(separatorToCamel, '_'), separatorToCamel);
    // const separatorToPascal = '_lorem_ip___sum_dolorSit-Amet';
    // console.log(ConverterHelper.separatorToPascal(separatorToPascal, '_'), separatorToPascal);
    // const lowerToSeparator = 'lorem___ipsum_dolorSit-amet';
    // console.log(ConverterHelper.lowerToSeparator(lowerToSeparator, '_'), lowerToSeparator);
    const upperToSeparator = 'create-expires-At-expireAfter-sec_onds-index-in-log';
    console.log(ConverterHelper.upperToSeparator(upperToSeparator, '-'), upperToSeparator);
  });
}
