import { ErrorClass } from '../../src';

export function run(): void {
  // try {
  //   // @ts-ignore
  //   data = 1;
  // } catch (e) {
  //   console.error(e);
  // }
  // console.log(new Error().stack);
  // console.log(ParserHelper.stack(new Error().stack));
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
  /**
   *
   */
  const stack =
    'UnauthorizedException: Unauthorized\n' +
    '    at AuthResolver.authSignIn (/Users/ivankosenko/Projects/pet/fa-node/src/app/auth/auth.resolver.ts:32:13)\n' +
    '    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n' +
    '    at async target (/Users/ivankosenko/Projects/pet/fa-node/node_modules/@nestjs/core/helpers/external-context-creator.js:74:28)\n' +
    '    at async Object.authSignIn (/Users/ivankosenko/Projects/pet/fa-node/node_modules/@nestjs/core/helpers/external-proxy.js:9:24)';
  // console.log(ParserHelper.stack(stack));
  // console.log(new Error('LOG'));
  // console.debug(new Error('DEBUG'));
  console.log(123);
}
