class MaskHelperClass {
  public mask<T>(dictionary: T, fullList: string[], partialList: string[]): T {
    return this.maskObject(dictionary, fullList, partialList);
  }

  private maskObject<T>(dictionary: T, fullList: string[], partialList: string[]): T {
    const result: Record<string, unknown> = {};
    for (const key in dictionary) {
      const value = dictionary[key];
      const lowerKey = key.toLowerCase();
      const fullMask = fullList.some((maskKey) => lowerKey.includes(maskKey));
      const partialMask = partialList.some((maskKey) => lowerKey.includes(maskKey));
      if (Array.isArray(value)) {
        if (fullMask) {
          result[key] = this.maskMatchedValue(value, (str) => str.replace(/[A-Za-z0-9]/g, '*'));
          continue;
        }
        if (partialMask) {
          result[key] = this.maskMatchedValue(value, (str) => this.maskPartial(str));
          continue;
        }
        result[key] = this.maskArray(value, fullList, partialList);
        continue;
      }
      if (typeof value === 'object' && value !== null) {
        result[key] = this.maskObject(value, fullList, partialList);
        continue;
      }
      const str = value?.toString?.() ?? '';
      // FULL MASK
      if (fullMask) {
        result[key] = str.replace(/[A-Za-z0-9]/g, '*');
        continue;
      }
      // PARTIAL MASK
      if (partialMask) {
        result[key] = this.maskPartial(str);
        continue;
      }
      result[key] = value;
    }
    return result as T;
  }

  private maskArray(values: unknown[], fullList: string[], partialList: string[]): unknown[] {
    let changed = false;
    const result = values.map((value) => {
      let masked = value;
      if (Array.isArray(value)) {
        masked = this.maskArray(value, fullList, partialList);
      } else if (typeof value === 'object' && value !== null) {
        masked = this.maskObject(value, fullList, partialList);
      }
      changed ||= masked !== value;
      return masked;
    });
    return changed ? result : values;
  }

  private maskMatchedValue(value: unknown, mask: (str: string) => string): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.maskMatchedValue(item, mask));
    }
    if (typeof value === 'object' && value !== null) {
      const result: Record<string, unknown> = {};
      for (const key in value) {
        result[key] = this.maskMatchedValue(value[key], mask);
      }
      return result;
    }
    return mask(value?.toString?.() ?? '');
  }

  private maskPartial(str: string): string {
    const prefixLength = 3;
    const suffixLength = 3;
    if (str.length <= prefixLength + suffixLength) {
      const first = str[0] ?? '';
      const last = str.length > 1 ? str[str.length - 1] : '';
      const middle = str.length > 2 ? str.slice(1, -1).replace(/[A-Za-z0-9]/g, '*') : '';
      return first + middle + last;
    }
    const prefix = str.slice(0, prefixLength);
    const suffix = str.slice(-suffixLength);
    const middle = str.slice(prefixLength, -suffixLength).replace(/[A-Za-z0-9]/g, '*');
    return prefix + middle + suffix;
  }
}

export const MaskHelper = new MaskHelperClass();
