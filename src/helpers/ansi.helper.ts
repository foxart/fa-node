export interface AnsiColorInterface {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  gray: string;
}

export interface AnsiEffectInterface {
  reset: string;
  bold: string;
  dim: string;
  underline: string;
  blink: string;
  reverse: string;
  hidden: string;
}

const FOREGROUND: AnsiColorInterface = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const BACKGROUND: AnsiColorInterface = {
  black: '\x1b[40m',
  red: '\x1b[41m',
  green: '\x1b[42m',
  yellow: '\x1b[43m',
  blue: '\x1b[44m',
  magenta: '\x1b[45m',
  cyan: '\x1b[46m',
  white: '\x1b[47m',
  gray: '\x1b[100m',
};

const EFFECT: AnsiEffectInterface = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
};

class ColorSingleton {
  private static self: ColorSingleton;
  public readonly ef: AnsiEffectInterface = EFFECT;
  public readonly fg: AnsiColorInterface = FOREGROUND;
  public readonly bg: AnsiColorInterface = BACKGROUND;

  public static getInstance(): ColorSingleton {
    if (!ColorSingleton.self) {
      ColorSingleton.self = new ColorSingleton();
    }
    return ColorSingleton.self;
  }

  public apply(
    data: string,
    ansiList: (AnsiColorInterface[keyof AnsiColorInterface] | AnsiEffectInterface[keyof AnsiEffectInterface])[],
  ): string {
    if (!ansiList.length) {
      return data;
    }
    return ansiList.join('') + data + this.ef.reset;
  }
}

export const AnsiHelper = ColorSingleton.getInstance();
AnsiHelper.apply('test', [FOREGROUND.black]);
AnsiHelper.apply('test', ['wrong']);
