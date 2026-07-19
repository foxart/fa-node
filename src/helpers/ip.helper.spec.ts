import { Request } from 'express';
import os from 'node:os';

import { IpHelper } from './ip.helper';

describe('IpHelper', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should find an external IPv4 address', () => {
    jest.spyOn(os, 'networkInterfaces').mockReturnValue({
      empty: undefined,
      internal: [{ address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true, cidr: '127.0.0.1/8' }],
      external: [{ address: '10.0.0.2', netmask: '255.255.255.0', family: 'IPv4', mac: '00:00:00:00:00:01', internal: false, cidr: '10.0.0.2/24' }],
    });

    expect(IpHelper.getLocalIp()).toBe('10.0.0.2');
  });

  it('should return null without an external IPv4 address', () => {
    jest.spyOn(os, 'networkInterfaces').mockReturnValue({});
    expect(IpHelper.getLocalIp()).toBeNull();
  });

  it('should resolve request IP sources in priority order', () => {
    expect(IpHelper.getRequestIp({ socket: { remoteAddress: '127.0.0.1' } } as Request)).toBe('127.0.0.1');
    expect(IpHelper.getRequestIp({ socket: {}, connection: { remoteAddress: '::1' } } as unknown as Request)).toBe('::1');
    expect(IpHelper.getRequestIp({ socket: {}, connection: { socket: { remoteAddress: '192.168.0.1' } } } as unknown as Request)).toBe('192.168.0.1');
    expect(IpHelper.getRequestIp({ socket: {}, headers: { 'x-forwarded-for': '203.0.113.1' } } as unknown as Request)).toBe('203.0.113.1');
    expect(IpHelper.getRequestIp({ socket: {}, headers: { 'x-real-ip': '203.0.113.2' } } as unknown as Request)).toBe('203.0.113.2');
    expect(IpHelper.getRequestIp({ socket: {}, headers: {}, info: { remoteAddress: '203.0.113.3' } } as never)).toBe('203.0.113.3');
    expect(IpHelper.getRequestIp({ socket: {}, headers: {}, requestContext: { identity: { sourceIp: '203.0.113.4' } } } as never)).toBe('203.0.113.4');
    expect(IpHelper.getRequestIp({ socket: {}, headers: {}, raw: { socket: { remoteAddress: '203.0.113.5' } } } as never)).toBe('203.0.113.5');
    expect(IpHelper.getRequestIp({ socket: {}, headers: { 'x-real-ip': ['invalid'] } } as never)).toBeNull();
  });

  it('should attach the resolved IP through middleware', () => {
    const request = { socket: { remoteAddress: '127.0.0.1' } } as Request;
    const next = jest.fn();
    IpHelper.middleware()(request, {} as never, next);
    expect((request as unknown as { clientIp: string }).clientIp).toBe('127.0.0.1');
    expect(next).toHaveBeenCalledTimes(1);

    const customRequest = { socket: { remoteAddress: '::1' } } as Request;
    IpHelper.middleware({ attributeName: 'sourceIp' })(customRequest, {} as never, next);
    expect((customRequest as unknown as { sourceIp: string }).sourceIp).toBe('::1');
  });

  it('should return null when no forwarded IP is valid', () => {
    const getForwarded = (IpHelper as unknown as { getClientIpFromXForwardedFor: (value: string) => string | null }).getClientIpFromXForwardedFor.bind(IpHelper);
    expect(getForwarded('invalid, also-invalid')).toBeNull();
  });
});
