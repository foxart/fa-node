import { CheckHelper } from '../helpers/check.helper';

interface DeepOptionsInterface {
  null?: boolean;
  undefined?: boolean;
  array?: boolean;
}

export class MergeClass {
  public deep<T extends object, S extends object>(
    target: T,
    source: S,
    options: DeepOptionsInterface = { null: true, undefined: false, array: false },
  ): T & S {
    const result = Array.isArray(target) ? ([...target] as unknown) : ({ ...target } as unknown);
    const out = result as Record<string, unknown>;
    for (const key in source) {
      const srcValue = source[key];
      if (!options.null && srcValue === null) {
        continue;
      }
      if (!options.undefined && srcValue === undefined) {
        continue;
      }
      const resultValue = out[key];
      if (Array.isArray(srcValue) && Array.isArray(resultValue)) {
        out[key] = options.array ? ([...(resultValue as unknown[]), ...(srcValue as unknown[])] as unknown) : srcValue;
        continue;
      }
      if (CheckHelper.isObject(srcValue) && CheckHelper.isObject(resultValue)) {
        out[key] = this.deep(resultValue as object, srcValue as object, options);
        continue;
      }
      out[key] = srcValue;
    }
    return result as T & S;
  }
}
