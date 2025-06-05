import { NextFunction, Request, Response } from 'express';
import { isIP } from 'net';
import os from 'node:os';

class IpSingleton {
  public getLocalIp(): string | null {
    const osNetworkInterfaces = os.networkInterfaces();
    for (const interfaceList of Object.values(osNetworkInterfaces)) {
      if (!interfaceList) continue;
      for (const networkInterface of interfaceList) {
        if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
          return networkInterface.address;
        }
      }
    }
    return null;
  }

  public getRequestIp(
    req: Request & {
      raw?: Request;
      connection?: { remoteAddress?: string; socket?: { remoteAddress?: string } };
      info?: { remoteAddress?: string };
      requestContext?: { identity?: { sourceIp?: string } };
    },
  ): string | null {
    if (req.socket?.remoteAddress && this.checkValueIsIp(req.socket.remoteAddress)) {
      return req.socket.remoteAddress;
    }
    if (req.connection?.remoteAddress && this.checkValueIsIp(req.connection.remoteAddress)) {
      return req.connection.remoteAddress;
    }
    if (req.connection?.socket?.remoteAddress && this.checkValueIsIp(req.connection.socket.remoteAddress)) {
      return req.connection.socket.remoteAddress;
    }
    // Header validation
    if (req.headers) {
      const checkList: (keyof typeof req.headers)[] = [
        'x-client-ip',
        'x-forwarded-for',
        'cf-connecting-ip',
        'do-connecting-ip',
        'fastly-client-ip',
        'true-client-ip',
        'x-real-ip',
        'x-cluster-client-ip',
        'x-forwarded',
        'forwarded-for',
        'forwarded',
        'x-appengine-user-ip',
        'Cf-Pseudo-IPv4',
      ];
      for (const check of checkList) {
        const value = req.headers[check];
        if (typeof value === 'string' && this.checkValueIsIp(value)) {
          return check === 'x-forwarded-for' ? this.getClientIpFromXForwardedFor(value) : value;
        }
      }
    }
    // Custom properties
    if (req.info?.remoteAddress && this.checkValueIsIp(req.info.remoteAddress)) {
      return req.info.remoteAddress;
    }
    if (req.requestContext?.identity?.sourceIp && this.checkValueIsIp(req.requestContext.identity.sourceIp)) {
      return req.requestContext.identity.sourceIp;
    }
    if (req.raw) {
      return this.getRequestIp(req.raw);
    }
    return null;
  }

  // Middleware for Express or similar frameworks
  public middleware(
    options: {
      attributeName?: string;
    } = {},
  ): (req: Request, res: Response, next: NextFunction) => void {
    const attributeName = options.attributeName || 'clientIp';
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getRequestIp(req);
      Object.defineProperty(req, attributeName, {
        get: () => ip,
        configurable: true,
      });
      next();
    };
  }

  private checkValueIsIp(value: string): boolean {
    return isIP(value) === 4 || isIP(value) === 6;
  }

  private getClientIpFromXForwardedFor(value: string): string | null {
    const forwardedIps = value.split(',').map((ip) => ip.trim());
    return forwardedIps.find((ip) => this.checkValueIsIp(ip)) || null;
    // try {
    //   const forwardedIps = value.split(',').map((e) => {
    //     const ip = e.trim();
    //     if (ip.includes(':')) {
    //       const ipSplit = ip.split(':');
    //       if (ipSplit.length === 2) {
    //         return ipSplit[0];
    //       }
    //     }
    //     return ip;
    //   });
    //   for (const ip of forwardedIps) {
    //     if (this.checkValueIsIp(ip)) {
    //       return ip;
    //     }
    //   }
    //   return null;
    // } catch (e) {
    //   return null;
    // }
  }
}

export const IpHelper = new IpSingleton();
