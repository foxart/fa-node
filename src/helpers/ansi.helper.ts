const FOREGROUND = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
} as const;

const BACKGROUND = {
  black: '\x1b[40m',
  red: '\x1b[41m',
  green: '\x1b[42m',
  yellow: '\x1b[43m',
  blue: '\x1b[44m',
  magenta: '\x1b[45m',
  cyan: '\x1b[46m',
  white: '\x1b[47m',
  gray: '\x1b[100m',
} as const;

const EFFECT = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
} as const;

export type AnsiColorKeyType =
  | (typeof FOREGROUND)[keyof typeof FOREGROUND]
  | (typeof BACKGROUND)[keyof typeof BACKGROUND];
export type AnsiEffectKeyType = (typeof EFFECT)[keyof typeof EFFECT];

export type AnsiEffectValueType = typeof EFFECT;
export type AnsiForegroundValueType = typeof FOREGROUND;
export type AnsiBackgroundValueType = typeof BACKGROUND;

class ColorSingleton {
  private static self: ColorSingleton;
  public readonly ef = EFFECT;
  public readonly fg = FOREGROUND;
  public readonly bg = BACKGROUND;

  public static getInstance(): ColorSingleton {
    if (!ColorSingleton.self) {
      ColorSingleton.self = new ColorSingleton();
    }
    return ColorSingleton.self;
  }

  public apply(data: string, ansiList: (AnsiColorKeyType | AnsiEffectKeyType)[]): string {
    if (!ansiList.length) {
      return data;
    }
    return ansiList.join('') + data + this.ef.reset;
  }
}

export const AnsiHelper = ColorSingleton.getInstance();
