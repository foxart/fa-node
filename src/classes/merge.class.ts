import { CheckHelper } from '../helpers/check.helper';

type DeepType = Record<string, unknown>;

interface DeepOptionsInterface {
  null?: boolean;
  undefined?: boolean;
  arrays?: boolean;
}

export class MergeClass {
  private deep(
    target: DeepType,
    source: Partial<DeepType>,
    options: DeepOptionsInterface = { null: true, undefined: false, arrays: false },
  ): void {
    for (const key in source) {
      const srcValue = source[key];
      if (!options.null && srcValue === null) {
        continue;
      }
      if (!options.undefined && srcValue === undefined) {
        continue;
      }
      const targetValue = target[key];
      if (Array.isArray(srcValue) && Array.isArray(targetValue)) {
        if (options.arrays) {
          target[key] = [...(targetValue as unknown[]), ...(srcValue as unknown[])];
        } else {
          target[key] = srcValue;
        }
        continue;
      }
      if (CheckHelper.isObject(srcValue) && CheckHelper.isObject(targetValue)) {
        this.deep(targetValue as DeepType, srcValue as DeepType, options);
        continue;
      }
      target[key] = srcValue;
    }
  }
}
