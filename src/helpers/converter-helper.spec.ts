import { ConverterHelper } from './converter.helper';

describe('ConverterHelper', () => {
  // ------------------------------
  // JSON / Circular references
  // ------------------------------
  describe('JSON serialization', () => {
    it('should convert simple object to JSON safely', () => {
      const obj = { x: 1, y: 'test', z: true };
      const json = ConverterHelper.toJson(obj);
      expect(JSON.parse(json)).toEqual(obj);
    });

    it('should handle circular references safely', () => {
      const obj: { key: number; self: unknown } = { key: 42, self: undefined };
      obj.self = obj;
      const json = ConverterHelper.toJson(obj);
      expect(json).toContain('[Circular]');
    });

    it('should handle arrays with circular references', () => {
      const arr: unknown[] = [];
      arr.push(arr);
      const json = ConverterHelper.toJson(arr);
      expect(json).toContain('[Circular]');
    });
  });

  // ------------------------------
  // Hex ↔ RGB
  // ------------------------------
  describe('Hex / RGB conversions', () => {
    it('should convert 6-digit hex to RGB and back', () => {
      expect(ConverterHelper.hexToRgb('#ff00ff')).toEqual([255, 0, 255]);
      expect(ConverterHelper.rgbToHex(255, 0, 255)).toBe('#ff00ff');
    });

    it('should handle 3-digit hex shorthand', () => {
      expect(ConverterHelper.hexToRgb('#f0f')).toEqual([255, 0, 255]);
    });

    it('should handle out-of-range RGB values', () => {
      expect(ConverterHelper.rgbToHex(-10, 300, 128)).toBe('#00ff80');
    });

    it('should handle invalid hex string', () => {
      expect(ConverterHelper.hexToRgb('#xyz')).toEqual([0, 0, 0]);
      expect(ConverterHelper.hexToRgb('')).toEqual([0, 0, 0]);
    });
  });

  // ------------------------------
  // Text transformations
  // ------------------------------
  describe('Text functions', () => {
    it('capitalize', () => {
      // пустая строка
      expect(ConverterHelper.capitalize('')).toBe('');
      // одна буква
      expect(ConverterHelper.capitalize('h')).toBe('H');
      expect(ConverterHelper.capitalize('H')).toBe('H');
      // несколько букв
      expect(ConverterHelper.capitalize('hello')).toBe('Hello');
      expect(ConverterHelper.capitalize('HELLO')).toBe('Hello');
      // пробелы
      expect(ConverterHelper.capitalize(' hello')).toBe('Hello');
      expect(ConverterHelper.capitalize('hello ')).toBe('Hello');
      expect(ConverterHelper.capitalize('   hello   ')).toBe('Hello');
      expect(ConverterHelper.capitalize('тест    тест')).toBe('Тест тест');
      // цифры и смешанные
      expect(ConverterHelper.capitalize('123abc')).toBe('123abc');
      expect(ConverterHelper.capitalize('abc123')).toBe('Abc123');
      expect(ConverterHelper.capitalize('aBCdef')).toBe('Abcdef');
    });

    it('titleCase', () => {
      // пустая строка
      expect(ConverterHelper.titleCase('')).toBe('');
      // простые слова
      expect(ConverterHelper.titleCase('hello world')).toBe('Hello World');
      expect(ConverterHelper.titleCase('a b c')).toBe('A B C');
      // пробелы
      expect(ConverterHelper.titleCase('multiple   spaces')).toBe('Multiple Spaces');
      expect(ConverterHelper.titleCase('  leading and trailing  ')).toBe('Leading And Trailing');
      // camelCase / PascalCase
      expect(ConverterHelper.titleCase('oneWord')).toBe('One Word');
      expect(ConverterHelper.titleCase('mixedCASE words')).toBe('Mixed Case Words');
      expect(ConverterHelper.titleCase('HTMLParser')).toBe('Html Parser');
      expect(ConverterHelper.titleCase('myXMLHttpRequest')).toBe('My Xml Http Request');
      // цифры и смешанные
      expect(ConverterHelper.titleCase('version2Update')).toBe('Version2 Update');
      expect(ConverterHelper.titleCase('A1B2C3')).toBe('A1 B2 C3');
      // кириллица
      expect(ConverterHelper.titleCase('тестирование кода')).toBe('Тестирование Кода');
      expect(ConverterHelper.titleCase('тестTest')).toBe('Тест Test');
    });

    it('toPascalCase', () => {
      // пустая строка
      expect(ConverterHelper.toPascalCase('')).toBe('');
      // обычные строки
      expect(ConverterHelper.toPascalCase('hello world')).toBe('HelloWorld');
      expect(ConverterHelper.toPascalCase('multiple   spaces')).toBe('MultipleSpaces');
      // уже Pascal / camel
      expect(ConverterHelper.toPascalCase('helloWorld')).toBe('HelloWorld');
      expect(ConverterHelper.toPascalCase('HelloWorld')).toBe('HelloWorld');
      // смешанные
      expect(ConverterHelper.toPascalCase('HTMLParser')).toBe('HtmlParser');
      expect(ConverterHelper.toPascalCase('myXMLHttpRequest')).toBe('MyXmlHttpRequest');
      expect(ConverterHelper.toPascalCase('version2Update')).toBe('Version2Update');
      expect(ConverterHelper.toPascalCase('a1 b2 c3')).toBe('A1B2C3');
      // кириллица
      expect(ConverterHelper.toPascalCase('тест код')).toBe('ТестКод');
      expect(ConverterHelper.toPascalCase('тестTest')).toBe('ТестTest');
    });

    it('toCamelCase', () => {
      // пустая строка
      expect(ConverterHelper.toCamelCase('')).toBe('');
      // обычные слова
      expect(ConverterHelper.toCamelCase('hello world')).toBe('helloWorld');
      expect(ConverterHelper.toCamelCase('multiple   spaces')).toBe('multipleSpaces');
      // camel / Pascal
      expect(ConverterHelper.toCamelCase('HelloWorld')).toBe('helloWorld');
      expect(ConverterHelper.toCamelCase('helloWorld')).toBe('helloWorld');
      // смешанные
      expect(ConverterHelper.toCamelCase('HTMLParser')).toBe('htmlParser');
      expect(ConverterHelper.toCamelCase('myXMLHttpRequest')).toBe('myXmlHttpRequest');
      expect(ConverterHelper.toCamelCase('version2Update')).toBe('version2Update');
      expect(ConverterHelper.toCamelCase('A1 b2 c3')).toBe('a1B2C3');
      // кириллица
      expect(ConverterHelper.toCamelCase('тест код')).toBe('тестКод');
      expect(ConverterHelper.toCamelCase('тестTest')).toBe('тестTest');
    });

    it('separateWords', () => {
      // пустая строка
      expect(ConverterHelper.separateWords('', '-')).toBe('');
      // один символ
      expect(ConverterHelper.separateWords('T', '-')).toBe('T');
      // только заглавные — не трогаем
      expect(ConverterHelper.separateWords('ABC', '-')).toBe('ABC');
      // базовый camelCase / PascalCase
      expect(ConverterHelper.separateWords('HelloWorld', '-')).toBe('Hello-World');
      expect(ConverterHelper.separateWords('HTMLParser', '-')).toBe('HTML-Parser');
      expect(ConverterHelper.separateWords('MyXMLHttpRequest', '-')).toBe('My-XML-Http-Request');
      expect(ConverterHelper.separateWords('TEst', '-')).toBe('T-Est');
      // цифры + слова
      expect(ConverterHelper.separateWords('Version2Update', '-')).toBe('Version2-Update');
      expect(ConverterHelper.separateWords('A1B2C3', '-')).toBe('A1-B2-C3');
      // кастомный разделитель
      expect(ConverterHelper.separateWords('myTestString', '-')).toBe('my-Test-String');
      expect(ConverterHelper.separateWords('JSONDataParser', '-')).toBe('JSON-Data-Parser');
      // смешанные последовательности + цифры
      expect(ConverterHelper.separateWords('parseHTML2Text', ' ')).toBe('parse HTML2 Text');
      expect(ConverterHelper.separateWords('loadJSONFile2Data', ' ')).toBe('load JSON File2 Data');
      expect(ConverterHelper.separateWords('XML2HTML', ' ')).toBe('XML2 HTML');
      // слова с несколькими акронимами подряд
      expect(ConverterHelper.separateWords('APIXMLParser', ' ')).toBe('APIXML Parser');
      expect(ConverterHelper.separateWords('HTTPRequestJSON', ' ')).toBe('HTTP Request JSON');
      // строка, начинающаяся с акронима + обычное слово
      expect(ConverterHelper.separateWords('URLStringHandler', ' ')).toBe('URL String Handler');
      // строка, где есть одиночная заглавная внутри слова
      expect(ConverterHelper.separateWords('teStIng', ' ')).toBe('te St Ing');
      // последовательности заглавных + маленькая
      expect(ConverterHelper.separateWords('XYZdata', ' ')).toBe('XY Zdata');
      // смешанные сценарии с разными разделителями
      expect(ConverterHelper.separateWords('parseXML_HTTP_Data', ' ')).toBe('parse XML_HTTP_Data');
    });
  });
});
