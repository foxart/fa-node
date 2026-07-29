class MaskHelperClass {
  public mask<T>(dictionary: T, fullList: string[], partialList: string[]): T {
    const result: Record<string, unknown> = {};
    for (const key in dictionary) {
      const value = dictionary[key];
      if (Array.isArray(value)) {
        result[key] = value;
        continue;
      }
      if (typeof value === 'object' && value !== null) {
        result[key] = this.mask(value, fullList, partialList);
        continue;
      }
      const str = value?.toString?.() ?? '';
      const lowerKey = key.toLowerCase();
      // FULL MASK
      if (fullList.some((maskKey) => lowerKey.includes(maskKey))) {
        result[key] = str.replace(/[A-Za-z0-9]/g, '*');
        continue;
      }
      // PARTIAL MASK
      if (partialList.some((maskKey) => lowerKey.includes(maskKey))) {
        const prefixLength = 3;
        const suffixLength = 3;
        if (str.length <= prefixLength + suffixLength) {
          const first = str[0] ?? '';
          const last = str.length > 1 ? str[str.length - 1] : '';
          const middle = str.length > 2 ? str.slice(1, -1).replace(/[A-Za-z0-9]/g, '*') : '';
          result[key] = first + middle + last;
        } else {
          const prefix = str.slice(0, prefixLength);
          const suffix = str.slice(-suffixLength);
          const middle = str.slice(prefixLength, -suffixLength).replace(/[A-Za-z0-9]/g, '*');
          result[key] = prefix + middle + suffix;
        }
        continue;
      }
      result[key] = value;
    }
    return result as T;
  }
}

export const MaskHelper = new MaskHelperClass();
