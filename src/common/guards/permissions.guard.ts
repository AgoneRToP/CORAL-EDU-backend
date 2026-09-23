import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Role } from '@prisma/client';
import {
  ResourceCategory,
  PermissionAction,
  IPermission,
} from '../types/permissions.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<{
      category: ResourceCategory;
      action: PermissionAction;
    }>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new UnauthorizedException('Пользователь не вошел в систему');
    }

    if (user.role === Role.SUPERADMIN) {
      return true;
    }

    const userPermissions: IPermission[] = user.permissions;

    if (!userPermissions || !Array.isArray(userPermissions)) {
      throw new ForbiddenException('У вас не настроены разрешения');
    }

    const hasAccess = userPermissions.some(
      (perm) =>
        perm.category === requiredPermission.category &&
        perm.access.includes(requiredPermission.action),
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'У вас недостаточно прав для выполнения этого действия',
      );
    }

    return true;
  }
}
