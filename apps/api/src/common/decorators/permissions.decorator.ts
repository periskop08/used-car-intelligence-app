import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '../enums/admin-permission.enum';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: AdminPermission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
