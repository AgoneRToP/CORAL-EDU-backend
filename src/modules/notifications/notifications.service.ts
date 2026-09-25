import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { NotificationEntity, NotificationAction, Prisma } from '@prisma/client';
import { from, merge, of, Subject, switchMap } from 'rxjs';

interface LogNotificationInput {
  entity: NotificationEntity;
  action: NotificationAction;
  entityId: number;
  title: string;
  message?: string;
  actorId?: number;
}

const notificationsChanged$ = new Subject<void>();

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: LogNotificationInput) {
    try {
      await this.prisma.notification.create({ data: input });
      notificationsChanged$.next();
    } catch (err) {
      console.error('Не удалось записать уведомление:', err);
    }
  }

  async getAll(query: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    entity?: NotificationEntity;
    action?: NotificationAction;
  }) {
    const { page = 1, limit = 20, isRead, entity, action } = query;

    const where: Prisma.NotificationWhereInput = {
      ...(isRead !== undefined && { isRead }),
      ...(entity && { entity }),
      ...(action && { action }),
    };

    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          actor: {
            select: { id: true, name: true, surname: true, role: true },
          },
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { isRead: false } }),
    ]);

    return {
      success: true,
      data: notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      unreadCount,
    };
  }

  async getUnreadCount() {
    const count = await this.prisma.notification.count({
      where: { isRead: false },
    });
    return { success: true, data: { count } };
  }

  async markRead(id: number) {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    notificationsChanged$.next();
    return { success: true, data: updated };
  }

  async markAllRead() {
    await this.prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    notificationsChanged$.next();
    return { success: true };
  }

  unreadStream() {
    return merge(of(null), notificationsChanged$).pipe(
      switchMap(() => from(this.getUnreadCount())),
    );
  }
}
