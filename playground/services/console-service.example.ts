import { ErrorClass } from '../../src';

const myError = new Error('My error');
const myCustomError = new ErrorClass({
  name: 'My custom error',
  message: 'message',
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

export function run(): void {
  // console.log(DataHelper.stackToTrace(stack, true));
  // console.log(stack);
  console.log(myError);
  console.log(myCustomError);
}
