import { ConverterHelper } from './converter.helper';
import { ParserHelper } from './parser.helper';

describe('ConverterHelper', () => {
  it('should convert JSON safely', () => {
    const obj = { x: 1 };
    const json = ConverterHelper.toJson(obj);
    expect(ParserHelper.json(json)).toEqual(obj);
  });

  it('should handle invalid JSON safely', () => {
    expect(ParserHelper.json('not-json')).toBe('not-json');
  });

  it('should convert hex to RGB and back', () => {
    const rgb = ConverterHelper.hexToRgb('#ff00ff');
    expect(rgb).toEqual([255, 0, 255]);
    expect(ConverterHelper.rgbToHex(255, 0, 255)).toBe('#ff00ff');
  });
});
