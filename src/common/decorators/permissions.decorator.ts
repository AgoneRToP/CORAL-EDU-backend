import { SetMetadata } from '@nestjs/common';
import { ResourceCategory, PermissionAction } from '../types/permissions.type';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (category: ResourceCategory, action: PermissionAction) =>
  SetMetadata(PERMISSIONS_KEY, { category, action });
