export function testDecoratorHelper(): void {
  // import('./decorator/test-decorator').then((module) => module.testDecorator());
  void import('./decorator/test-decorator-entity').then((module) => module.testDecoratorEntity());
}
