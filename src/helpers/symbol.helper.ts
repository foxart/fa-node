class SymbolSingleton {
  private static self: SymbolSingleton;

  public readonly arrow = {
    LEFT: '\u2190', // ←
    UP: '\u2191', // ↑
    RIGHT: '\u2192', // →
    DOWN: '\u2193', // ↓
  };

  public readonly status = {
    SUCCESS: '\u2714', // ✔
    ERROR: '\u2716', // ✖
    WARNING: '\u26A0', // ⚠
  };

  public static getInstance(): SymbolSingleton {
    if (!SymbolSingleton.self) {
      SymbolSingleton.self = new SymbolSingleton();
    }
    return SymbolSingleton.self;
  }
}

export const SymbolHelper = SymbolSingleton.getInstance();
