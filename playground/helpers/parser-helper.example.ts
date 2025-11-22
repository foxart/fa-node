import { ParserHelper } from '../../src';

export function run(): void {
  const stack1 =
    'Error: {"context":"graphql","error":{"name":"AuthGuard","message":{"name":"JsonWebTokenError","message":"jwt malformed"},"status":400,"type":"ErrorService","stack":["src/common/guard/auth.guard.ts:54:13","src/common/guard/auth.guard.ts:41:24"]},"metadata":{"timestamp":"2024-06-20T13:53:58.767Z","name":"bh-api","version":"0.0.1","env":"local","port":3000,"cwd":"/Users/ivankosenko/Projects/pet/fa-node","proxy":{"console":true}},"data":{"url":"/graphql","path":"/","method":"QUERY","body":"mutation create { createBooking(booking: { redirect_payment_url: \\"https://beinharim.loc/affiliates/redirectToConfirm\\" custom_booked_by: \\"booking@email.com\\" customer_f_name: \\"BookingName\\" customer_l_name: \\"BookingSurname\\" customer_email: \\"booking@email.com\\" customer_country: \\"EN\\" customer_phone: \\"+380974346265\\" payment_type: \\"tranzila\\" orders: [ { fname: \\"OrderName\\" lname: \\"OrderSurname\\" adults: 2 children: 0 students: 0 tour_id: 29 wanted_days: \\"2024-05-15T00:00:00.000Z\\" guide_lang_id: 1 vat: 1 is_passport: true } ] }) }"}}\n' +
    '    at UnhandledExceptionFilter.catch (/Users/ivankosenko/Projects/pet/fa-node/src/common/filter/unhandled-exception.filter.ts:97:15)\n' +
    '    at ExternalExceptionsHandler.invokeCustomFilters (/Users/ivankosenko/Projects/pet/fa-node/node_modules/@nestjs/core/exceptions/external-exceptions-handler.js:31:32)\n' +
    '    at ExternalExceptionsHandler.next (/Users/ivankosenko/Projects/pet/fa-node/node_modules/@nestjs/core/exceptions/external-exceptions-handler.js:14:29)\n' +
    '    at Object.createBooking (/Users/ivankosenko/Projects/pet/fa-node/node_modules/@nestjs/core/helpers/external-proxy.js:14:42)\n' +
    '    at processTicksAndRejections (node:internal/process/task_queues:95:5)';
  // console.log({ parse: ParserHelper.stack(stack, { full: true }) });
  /**
   *
   */
  const errorStack = new Error().stack;
  // console.log(errorStack);
  console.log(ParserHelper.stack(new Error().stack));
  console.log([]);
  console.log(null);
}
