import { SYMBOL_ARROW, SYMBOL_COMMON, SYMBOL_STATUS, SymbolHelper } from './symbol.helper';

describe('SymbolHelper', () => {
  it('should expose arrow, status, and common symbols', () => {
    expect(SYMBOL_ARROW).toStrictEqual({ LEFT: '←', UP: '↑', RIGHT: '→', DOWN: '↓' });
    expect(SYMBOL_STATUS).toStrictEqual({ SUCCESS: '✔', ERROR: '✖', WARNING: '⚠' });
    expect(SYMBOL_COMMON).toStrictEqual({ SEPARATOR: '┃' });
    expect(SymbolHelper.arrow).toBe(SYMBOL_ARROW);
    expect(SymbolHelper.status).toBe(SYMBOL_STATUS);
    expect(SymbolHelper.common).toBe(SYMBOL_COMMON);
  });
});
