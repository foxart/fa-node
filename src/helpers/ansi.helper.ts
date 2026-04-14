export type AnsiColorKeyType = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray';

export type AnsiColorValueType =
  | (typeof FOREGROUND)[keyof typeof FOREGROUND]
  | (typeof BACKGROUND)[keyof typeof BACKGROUND];
export type AnsiEffectValueType = (typeof EFFECT)[keyof typeof EFFECT];

export type AnsiEffectType = typeof EFFECT;
export type AnsiForegroundType = typeof FOREGROUND;
export type AnsiBackgroundType = typeof BACKGROUND;

type AnsiColorMapType = Readonly<Record<AnsiColorKeyType, string>>;

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
} as const satisfies AnsiColorMapType;

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
} as const satisfies AnsiColorMapType;

const EFFECT = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
} as const;

class AnsiHelperClass {
  public readonly ef = EFFECT;
  public readonly fg = FOREGROUND;
  public readonly bg = BACKGROUND;

  public apply(data: string, ansiList: (AnsiColorValueType | AnsiEffectValueType)[]): string {
    if (!ansiList.length) {
      return data;
    }
    return ansiList.join('') + data + this.ef.reset;
  }
}

export const AnsiHelper = new AnsiHelperClass();
