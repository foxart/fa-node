export class StringHelper {
  public static toKebabCase(str: string): string {
    return this.splitWords(str)
      .map((w) => w.toLowerCase())
      .join('-');
  }

  public static toSnakeCase(str: string): string {
    return this.splitWords(str)
      .map((w) => w.toLowerCase())
      .join('_');
  }

  public static toCamelCase(str: string): string {
    const words = this.splitWords(str);
    return words
      .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join('');
  }

  public static toPascalCase(str: string): string {
    return this.splitWords(str)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }

  public static toConstantCase(str: string): string {
    return this.splitWords(str)
      .map((w) => w.toUpperCase())
      .join('_');
  }

  private static splitWords(str: string): string[] {
    return str
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1 $2')
      .replace(/[_\-\s]+/g, ' ')
      .trim()
      .split(' ');
  }
}
