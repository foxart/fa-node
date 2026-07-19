import { RouteClass } from './route.class';

describe('RouteClass', () => {
  class Route extends RouteClass {}

  it('should expose a route without a prefix', () => {
    const route = new Route({ path: 'health' });

    expect(route.getPrefix()).toBe('');
    expect(route.getPath()).toBe('health');
    expect(route.getRoute()).toBe('/health');
  });

  it('should expose a prefixed route', () => {
    const route = new Route({ path: 'users', prefix: 'api' });

    expect(route.getPrefix()).toBe('api');
    expect(route.getRoute()).toBe('/api/users');
  });
});
