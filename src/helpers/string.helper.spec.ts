import { StringHelper } from './string.helper';

describe('StringHelper', () => {
  it('should transform common word formats', () => {
    expect(StringHelper.toKebabCase('HTTPServer value')).toBe('http-server-value');
    expect(StringHelper.toSnakeCase('camelCase-value')).toBe('camel_case_value');
    expect(StringHelper.toCamelCase('HELLO_world-value')).toBe('helloWorldValue');
    expect(StringHelper.toPascalCase('hello_world-value')).toBe('HelloWorldValue');
    expect(StringHelper.toConstantCase('helloWorld value')).toBe('HELLO_WORLD_VALUE');
  });
});
