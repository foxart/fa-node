export interface ErrorClassInterface {
  name: string;
  message: string;
  status: number;
  details?: object;
  stack?: string;
}

export class ErrorClass extends Error {
  public readonly status: number;

  public readonly details?: object;

  public constructor(error: ErrorClassInterface) {
    super();
    // if (error instanceof Error) {
    //   this.name = error.name;
    //   this.message = error.message;
    //   this.status = 500;
    // } else {
    this.name = error.name;
    this.message = error.message;
    this.status = error.status;
    if (error.details) {
      this.details = error.details;
    }
    this.stack = error.stack ? error.stack : this.stack;
  }
}
