import { MiddlewareClass } from '../../src/classes/middleware.class';

function middlewareAddUse(): void {
  const payload1 = { name: 'case 1', data: 1 };
  const payload2 = { name: 'case 1', data: 10 };
  const middleware = new MiddlewareClass<{ name: string; data: number }>();
  middleware.add((payload, next) => {
    next({
      name: payload.name,
      data: payload.data + 1,
    });
  });
  middleware.add((payload, next) => {
    next({
      name: payload.name,
      data: payload.data + 1,
    });
  });
  middleware.use(payload1, (payload) => {
    console.log(`${middlewareAddUse.name} 1`, payload);
  });
  middleware.use(payload2, (payload) => {
    console.log(`${middlewareAddUse.name} 2`, payload);
  });
}

export function middlewareExample(): void {
  middlewareAddUse();
}
