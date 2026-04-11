export type SymbolArrowKeyType = 'LEFT' | 'UP' | 'RIGHT' | 'DOWN';
export type SymbolStatusKeyType = 'SUCCESS' | 'ERROR' | 'WARNING';
export type SymbolCommonKeyType = 'SEPARATOR';

type SymbolArrowMapType = Readonly<Record<SymbolArrowKeyType, string>>;
type SymbolStatusMapType = Readonly<Record<SymbolStatusKeyType, string>>;
type SymbolCommonMapType = Readonly<Record<SymbolCommonKeyType, string>>;

const ARROW = {
  LEFT: '\u2190', // ←
  UP: '\u2191', // ↑
  RIGHT: '\u2192', // →
  DOWN: '\u2193', // ↓
} as const satisfies SymbolArrowMapType;

const STATUS = {
  SUCCESS: '\u2714', // ✔
  ERROR: '\u2716', // ✖
  WARNING: '\u26A0', // ⚠
} as const satisfies SymbolStatusMapType;

const COMMON = {
  SEPARATOR: '\u2503', // ┃
} as const satisfies SymbolCommonMapType;

export type SymbolArrowValueType = (typeof ARROW)[keyof typeof ARROW];
export type SymbolStatusValueType = (typeof STATUS)[keyof typeof STATUS];
export type SymbolCommonValueType = (typeof COMMON)[keyof typeof COMMON];

export type SymbolArrowType = typeof ARROW;
export type SymbolStatusType = typeof STATUS;
export type SymbolCommonType = typeof COMMON;

class SymbolSingleton {
  private static self: SymbolSingleton;

  public readonly arrow = ARROW;
  public readonly status = STATUS;
  public readonly common = COMMON;

  public static getInstance(): SymbolSingleton {
    if (!SymbolSingleton.self) {
      SymbolSingleton.self = new SymbolSingleton();
    }
    return SymbolSingleton.self;
  }
}

export const SymbolHelper = SymbolSingleton.getInstance();
