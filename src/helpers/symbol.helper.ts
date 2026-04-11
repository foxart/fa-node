export type SymbolArrowKeyType = 'LEFT' | 'UP' | 'RIGHT' | 'DOWN';
export type SymbolStatusKeyType = 'SUCCESS' | 'ERROR' | 'WARNING';

type SymbolArrowMapType = Readonly<Record<SymbolArrowKeyType, string>>;
type SymbolStatusMapType = Readonly<Record<SymbolStatusKeyType, string>>;

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

export type SymbolArrowValueType = (typeof ARROW)[keyof typeof ARROW];
export type SymbolStatusValueType = (typeof STATUS)[keyof typeof STATUS];

export type SymbolArrowType = typeof ARROW;
export type SymbolStatusType = typeof STATUS;

class SymbolSingleton {
  private static self: SymbolSingleton;

  public readonly arrow = ARROW;
  public readonly status = STATUS;

  public static getInstance(): SymbolSingleton {
    if (!SymbolSingleton.self) {
      SymbolSingleton.self = new SymbolSingleton();
    }
    return SymbolSingleton.self;
  }
}

export const SymbolHelper = SymbolSingleton.getInstance();
