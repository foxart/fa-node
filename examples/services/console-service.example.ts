import { ParserHelper } from '../../src';
import { ErrorClass } from '../../src/classes/error.class';

export function run(): void {
  // try {
  //   // @ts-ignore
  //   data = 1;
  // } catch (e) {
  //   console.error(e);
  // }
  console.log(new Error().stack);
  console.log(ParserHelper.stack(new Error().stack));
  // const errorClassError = new ErrorClass({ name: 'name', message: 'dd', status: 1 });
  // console.error(errorClassError);
  /**
   *
   */
  const errorClass = new ErrorClass({
    name: 'Custom name',
    message: 'Custom message',
    details: { a: 1 },
    status: 500,
  });
  // console.log(errorClass);
}
