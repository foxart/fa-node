class ConverterSingleton {
  private static self: ConverterSingleton;

  public static getInstance(): ConverterSingleton {
    if (!ConverterSingleton.self) {
      ConverterSingleton.self = new ConverterSingleton();
    }
    return ConverterSingleton.self;
  }

  /** Первая буква заглавная, остальное без изменений */
  public capitalize(str: string): string {
    if (!str) return '';
    const cleaned = str.trim().replace(/\s+/g, ' ');
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }

  /** Первая буква строчная, остальное без изменений */
  public decapitalize(str: string): string {
    if (!str) return '';
    const cleaned = str.trim().replace(/\s+/g, ' ');
    return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
  }

  /** Заглавная первая буква каждого слова */
  public titleCase(str: string): string {
    if (!str) return '';
    const cleaned = str
      .trim()
      .replace(/([\p{Ll}0-9])(\p{Lu})/gu, '$1 $2')
      .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2');
    return cleaned
      .split(/\s+/) // разбиваем по любым пробелам
      .filter(Boolean)
      .map((word) => this.capitalize(word)) // капитализируем каждое слово
      .join(' '); // склеиваем одним пробелом
  }

  public toPascalCase(str: string, separator = ' '): string {
    if (!str) return '';
    const words = this.separateWords(str, separator)
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => this.capitalize(w));
    return words.join('');
  }

  public toCamelCase(str: string, separator = ' '): string {
    if (!str) return '';
    const words = this.separateWords(str, separator)
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => this.capitalize(w));
    if (words.length === 0) return '';
    // первая буква — строчная
    words[0] = this.decapitalize(words[0]);
    return words.join('');
  }

  public separateWords(str: string, separator: string): string {
    // return str
    //   .replace(/[A-Z]/g, (match, index) => (index === 0 ? match : `${separator}${match}`))
    //   .replace(new RegExp(`${separator}{2,}`, 'g'), separator)
    //   .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');
    // Разделяем перед заглавной буквой, если перед ней стоит строчная или цифра
    if (!str) return '';
    return (
      str
        // lower/number → Uppercase
        .replace(/([\p{Ll}0-9])(\p{Lu})/gu, `$1${separator}$2`)
        // UPPER-sequence + Uppercase-Lowercase  (HTML2Text → HTML2 Text, XMLHTTP → XML HTTP)
        .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, `$1${separator}$2`)
        // Удаляем повторяющиеся разделители
        .replace(new RegExp(`${separator}{2,}`, 'g'), separator)
        // Обрезаем разделитель по краям
        .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '')
    );
  }

  /** JSON.stringify с безопасной обработкой циклических ссылок */
  public toJson(data: unknown, indent = 2): string {
    const cache: unknown[] = [];
    return JSON.stringify(
      data,
      (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.includes(value)) {
            return '[Circular]';
          }
          cache.push(value);
        }
        return value as string;
      },
      indent,
    );
  }

  /** Hex → [R,G,B], поддержка 3- и 6-значного hex */
  public hexToRgb(hex: string): [number, number, number] {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const r = parseInt(clean.slice(0, 2), 16) || 0;
    const g = parseInt(clean.slice(2, 4), 16) || 0;
    const b = parseInt(clean.slice(4, 6), 16) || 0;
    return [r, g, b];
  }

  /** [R,G,B] → Hex, значения ограничиваются 0-255 */
  public rgbToHex(r: number, g: number, b: number): string {
    const clamp = (n: number): number => {
      return Math.max(0, Math.min(255, Math.round(n)));
    };
    const to2 = (n: number): string => {
      return clamp(n).toString(16).padStart(2, '0');
    };
    return `#${to2(r)}${to2(g)}${to2(b)}`;
  }
}

export const ConverterHelper = ConverterSingleton.getInstance();
