import { ErrorClass } from '../../src/classes/error.class';

export function run(): void {
  // try {
  //   // @ts-ignore
  //   data = 1;
  // } catch (e) {
  //   console.error(e);
  // }
  // console.log(new ErrorService('simple sting'));
  const errorClassError = new ErrorClass({ name: 'name', message: 'dd', httpStatus: 1 });
  console.error(errorClassError);
  /**
   *
   */
  const errorClass = new ErrorClass({
    name: 'Custom name',
    message: 'Custom message',
    details: { a: 1 },
    httpStatus: 500,
  });
  console.log(errorClass);
}
