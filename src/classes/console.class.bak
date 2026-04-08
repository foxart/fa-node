interface ForegroundInterface {
  red: string;
  green: string;
  blue: string;
  yellow: string;
  magenta: string;
  cyan: string;
  white: string;
}

interface BackgroundInterface {
  red: string;
  green: string;
  blue: string;
  yellow: string;
  magenta: string;
  cyan: string;
  white: string;
}

interface EffectInterface {
  bold: string;
  dim: string;
  reset: string;
  underline: string;
}

interface ArrowInterface {
  left: string;
  up: string;
  right: string;
  down: string;
}

interface StatusInterface {
  success: string;
  error: string;
  warning: string;
}

const EFFECT_ON: EffectInterface = {
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  reset: '\u001b[0m',
  underline: '\u001b[4m',
};
const FOREGROUND_ON: ForegroundInterface = {
  red: '\u001b[31m',
  green: '\u001b[32m',
  blue: '\u001b[34m',
  yellow: '\u001b[33m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
};
const BACKGROUND_ON: BackgroundInterface = {
  red: '\u001b[41m',
  green: '\u001b[42m',
  blue: '\u001b[44m',
  yellow: '\u001b[43m',
  magenta: '\u001b[45m',
  cyan: '\u001b[46m',
  white: '\u001b[47m',
};
const EFFECT_OFF: EffectInterface = {
  bold: '',
  dim: '',
  reset: '',
  underline: '',
};
const FOREGROUND_OFF: ForegroundInterface = {
  red: '',
  green: '',
  blue: '',
  yellow: '',
  magenta: '',
  cyan: '',
  white: '',
};
const BACKGROUND_OFF: BackgroundInterface = {
  red: '',
  green: '',
  blue: '',
  yellow: '',
  magenta: '',
  cyan: '',
  white: '',
};
const ARROW: ArrowInterface = {
  left: '\u2190', // ←
  up: '\u2191', // ↑
  right: '\u2192', // →
  down: '\u2193', // ↓
};
const STATUS: StatusInterface = {
  success: '\u2714', // ✔
  error: '\u2716', // ✖
  warning: '\u26A0', // ⚠
};

export class ConsoleClass {
  public readonly effect: EffectInterface;

  public readonly foreground: ForegroundInterface;

  public readonly background: BackgroundInterface;

  public readonly arrow: ArrowInterface;

  public readonly status: StatusInterface;

  public constructor(protected readonly color: boolean) {
    if (color) {
      this.effect = EFFECT_ON;
      this.foreground = FOREGROUND_ON;
      this.background = BACKGROUND_ON;
    } else {
      this.effect = EFFECT_OFF;
      this.foreground = FOREGROUND_OFF;
      this.background = BACKGROUND_OFF;
    }
    this.arrow = ARROW;
    this.status = STATUS;
  }

  public wrap(data: string, colorList: string[]): string {
    if (!this.color) {
      return data;
    }
    return `${colorList.join('')}${data}${this.effect.reset}`;
  }
}
