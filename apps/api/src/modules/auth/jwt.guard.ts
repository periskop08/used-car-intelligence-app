import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Authentication token not found');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
      });

      // Verify user exists in the database
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });
      if (!user) {
        throw new UnauthorizedException('User no longer exists in the system');
      }

      // Attach complete user object to request
      request['user'] = {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        subscriptionTier: user.subscriptionTier,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization || (request.headers as any)['x-access-token'];
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        return parts[1].trim();
      }
      if (parts.length === 1 && parts[0].length > 10 && !parts[0].includes(' ')) {
        return parts[0].trim();
      }
    }
    const queryToken = request.query?.token || request.query?.accessToken;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken.trim();
    }
    return undefined;
  }
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      return true;
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });
      if (user) {
        request['user'] = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          subscriptionTier: user.subscriptionTier,
        };
      }
    } catch (err) {
      // Don't fail if optional auth fails
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization || (request.headers as any)['x-access-token'];
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        return parts[1].trim();
      }
      if (parts.length === 1 && parts[0].length > 10 && !parts[0].includes(' ')) {
        return parts[0].trim();
      }
    }
    const queryToken = request.query?.token || request.query?.accessToken;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken.trim();
    }
    return undefined;
  }
}
