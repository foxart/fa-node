import { CodegenHelper } from '../../src';

export function CodegenHelperExample(): void {
  console.clear();
  const name = 'lorem ipsum';
  const message = 'dolor sit amet';
  CodegenHelper.displayMessage(name, message);
  CodegenHelper.logSuccess(name, message);
  CodegenHelper.logError(name, new Error('Custom error'));
}
