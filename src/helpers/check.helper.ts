interface IsEmptyOptionsInterface {
  blankString?: boolean;
  null?: boolean;
  undefined?: boolean;
  zeroNumber?: boolean;
  emptyArray?: boolean;
  emptyObject?: boolean;
}

class Check {
  private static self: Check;

  public static getInstance(): Check {
    if (!Check.self) {
      Check.self = new Check();
    }
    return Check.self;
  }

  public isArray(data: unknown): data is unknown[] {
    return Array.isArray(data);
  }

  public isArrayEmpty(data: unknown): boolean {
    return this.isArray(data) && (data as []).length === 0;
  }

  public isBuffer(data: unknown): boolean {
    if (typeof Buffer === 'undefined') {
      return false;
    }
    return data instanceof Buffer || Buffer.isBuffer(data);
  }

  public isEmpty(data: unknown, options?: IsEmptyOptionsInterface): boolean {
    if (options?.undefined && data === undefined) {
      return true;
    } else if (options?.null && data === null) {
      return true;
    } else if (options?.blankString && data === '') {
      return true;
    } else if (options?.zeroNumber && data === 0) {
      return true;
    } else if (options?.emptyObject && this.isObjectEmpty(data)) {
      return true;
    } else if (options?.emptyArray && this.isArrayEmpty(data)) {
      return true;
    }
    return false;
  }

  public isEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true;
    }
    if (typeof a !== typeof b) {
      return false;
    }
    if (this.isArray(a) && this.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!this.isEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    if (this.isObject(a) && this.isObject(b)) {
      const keysA = Object.keys(a as Record<string, unknown>);
      const keysB = Object.keys(b as Record<string, unknown>);
      if (keysA.length !== keysB.length) {
        return false;
      }
      for (const key of keysA) {
        if (!(key in (b as Record<string, unknown>))) {
          return false;
        }
        if (!this.isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  public isInstance(data: unknown): boolean {
    return this.isObject(data) && Object.getPrototypeOf(data) !== Object.prototype;
  }

  public isMongoId(data: unknown): boolean {
    return data instanceof Object ? /^[0-9a-fA-F]{24}$/.test(data.toString()) : false;
  }

  public isNull(data: unknown): boolean {
    return data === null;
  }

  public isObject(data: unknown): boolean {
    if (this.isArray(data)) {
      return false;
    } else if (this.isMongoId(data) || data instanceof Date || data instanceof RegExp) {
      return false;
    } else if (data instanceof Map || data instanceof Set || data instanceof WeakMap || data instanceof WeakSet) {
      return false;
    } else if (this.isBuffer(data) || data instanceof Uint8Array) {
      return false;
    } else {
      return data instanceof Object;
    }
  }

  public isObjectEmpty(data: unknown): boolean {
    return this.isObject(data) && Object.keys(data as object).length === 0;
  }

  public isPrimitive(data: unknown): boolean {
    return (
      data === undefined ||
      data === null ||
      typeof data === 'string' ||
      typeof data === 'number' ||
      typeof data === 'boolean' ||
      typeof data === 'symbol' ||
      typeof data === 'bigint'
    );
  }
}

export const CheckHelper = Check.getInstance();
