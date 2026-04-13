interface OptionsInterface {
  path: string;
  prefix?: string;
}

export abstract class RouteClass {
  private readonly prefix: string;

  private readonly path: string;

  private readonly route: string;

  public constructor(options: OptionsInterface) {
    this.path = options.path;
    this.prefix = options?.prefix ? options.prefix : '';
    this.route = this.prefix ? `/${this.prefix}/${this.path}` : `/${this.path}`;
  }

  public getPrefix(): string {
    return this.prefix;
  }

  public getPath(): string {
    return this.path;
  }

  public getRoute(): string {
    return this.route;
  }
}
