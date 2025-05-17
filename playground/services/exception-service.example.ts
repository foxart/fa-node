import { ExceptionHelper } from '../../src';

export function run(): void {
  try {
    // a = 1;
  } catch (err) {
    // const result = exceptionHelper.parse(new mongoose.mongo.MongoError('XXX'));
    const result = ExceptionHelper.castToException(err as Error);
    console.log(result);
  }
}
