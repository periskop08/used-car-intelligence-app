import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AdminPermission, DEFAULT_ROLE_PERMISSIONS } from '../enums/admin-permission.enum';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Kullanıcı yetkilendirmesi bulunamadı.');
    }

    // Fetch full user record from database to verify role & custom assigned permissions
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, permissions: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new ForbiddenException('Kullanıcı hesabı pasif veya bulunamadı.');
    }

    const roleName = String(dbUser.role);
    if (roleName === 'SUPER_ADMIN') {
      return true; // Super admin has all permissions
    }

    // Combine default role permissions with explicit user permissions
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
    const customPerms = (dbUser.permissions as string[]) || [];
    const userPermissions = new Set([...defaultPerms, ...customPerms]);

    const hasAll = requiredPermissions.every((perm) => userPermissions.has(perm));

    if (!hasAll) {
      throw new ForbiddenException(`Bu işlem için yetkiniz bulunmuyor. Gereken yetkiler: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
