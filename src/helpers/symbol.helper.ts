export type SymbolArrowKeyType = 'LEFT' | 'UP' | 'RIGHT' | 'DOWN';
export type SymbolStatusKeyType = 'SUCCESS' | 'ERROR' | 'WARNING';
export type SymbolCommonKeyType = 'SEPARATOR';

type SymbolArrowMapType = Readonly<Record<SymbolArrowKeyType, string>>;
type SymbolStatusMapType = Readonly<Record<SymbolStatusKeyType, string>>;
type SymbolCommonMapType = Readonly<Record<SymbolCommonKeyType, string>>;

export const SYMBOL_ARROW = {
  LEFT: '\u2190', // ←
  UP: '\u2191', // ↑
  RIGHT: '\u2192', // →
  DOWN: '\u2193', // ↓
} as const satisfies SymbolArrowMapType;

export const SYMBOL_STATUS = {
  SUCCESS: '\u2714', // ✔
  ERROR: '\u2716', // ✖
  WARNING: '\u26A0', // ⚠
} as const satisfies SymbolStatusMapType;

export const SYMBOL_COMMON = {
  SEPARATOR: '\u2503', // ┃
} as const satisfies SymbolCommonMapType;

export type SymbolArrowValueType = (typeof SYMBOL_ARROW)[keyof typeof SYMBOL_ARROW];
export type SymbolStatusValueType = (typeof SYMBOL_STATUS)[keyof typeof SYMBOL_STATUS];
export type SymbolCommonValueType = (typeof SYMBOL_COMMON)[keyof typeof SYMBOL_COMMON];

export type SymbolArrowType = typeof SYMBOL_ARROW;
export type SymbolStatusType = typeof SYMBOL_STATUS;
export type SymbolCommonType = typeof SYMBOL_COMMON;

class SymbolHelperClass {
  public readonly arrow = SYMBOL_ARROW;
  public readonly status = SYMBOL_STATUS;
  public readonly common = SYMBOL_COMMON;
}

export const SymbolHelper = new SymbolHelperClass();
