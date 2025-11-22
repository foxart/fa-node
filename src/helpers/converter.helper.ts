class ConverterSingleton {
  private static self: ConverterSingleton;

  public static getInstance(): ConverterSingleton {
    if (!ConverterSingleton.self) {
      ConverterSingleton.self = new ConverterSingleton();
    }
    return ConverterSingleton.self;
  }

  // public dateToSting(date: Date): string {
  //   return date.toISOString().replace(/T/, ' ').replace(/Z/, '');
  // }
  public lowerToSeparator(string: string, separator: string): string {
    return string
      .replace(/[a-z]/g, (match, index) => (index === 0 ? match : `${separator}${match}`))
      .replace(new RegExp(`${separator}{2,}`, 'g'), separator)
      .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');
  }

  public upperToSeparator(string: string, separator: string): string {
    return string
      .replace(/[A-Z]/g, (match, index) => (index === 0 ? match : `${separator}${match}`))
      .replace(new RegExp(`${separator}{2,}`, 'g'), separator)
      .replace(new RegExp(`^${separator}|${separator}$`, 'g'), '');
  }

  public separatorToCamel(string: string, separator: string): string {
    return string
      .split(separator)
      .map((word, index) => {
        return index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');
  }

  public separatorToPascal(string: string, separator: string): string {
    return string
      .split(separator)
      .map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');
  }
  /**
   * CONVERT FUNCTIONS
   */
  public toJson(data: unknown, indent?: number): string {
    const cache: unknown[] = [];
    return JSON.stringify(
      data,
      (_key, value: unknown) => {
        return typeof value === 'object' && value !== null
          ? cache.includes(value)
            ? '[Converting circular structure to JSON]'
            : cache.push(value) && value
          : value;
      },
      indent ?? 2,
    );
  }

  public hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    let r: number, g: number, b: number;
    if (clean.length === 6) {
      r = parseInt(clean.slice(0, 2), 16);
      g = parseInt(clean.slice(2, 4), 16);
      b = parseInt(clean.slice(4, 6), 16);
    } else {
      r = 0;
      g = 0;
      b = 0;
    }
    return [r, g, b];
  }

  public rgbToHex(r: number, g: number, b: number): string {
    const to2 = (n: number): string => {
      const h = n.toString(16);
      return h.length === 1 ? '0' + h : h;
    };
    return `#${to2(r)}${to2(g)}${to2(b)}`;
  }
}

export const ConverterHelper = ConverterSingleton.getInstance();
