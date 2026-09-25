import { PrismaService } from '@/core/database/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuaryRoomDto } from './dto/quary-room.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import {
  NotificationAction,
  NotificationEntity,
  Prisma,
  Status,
} from '@prisma/client';
import { UpdateRoomDto } from './dto/update-room.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ROOM_LABELS } from './room.constants';
import { buildChanges } from '@/common/utils/build-changes';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getAll(query: QuaryRoomDto) {
    const { status, search, page = 1, limit = 10 } = query;

    const where: Prisma.RoomWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(status && { status }),
    };

    const [rooms, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),

      this.prisma.room.count({ where }),
    ]);

    return {
      success: true,
      data: rooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number) {
    const room = await this.prisma.room.findFirst({
      where: { id },
    });

    if (!room) {
      throw new NotFoundException('Кабинет не найден');
    }

    return {
      success: true,
      data: room,
    };
  }

  async create(dto: CreateRoomDto, actorId?: number) {
    const existing = await this.prisma.room.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Кабинет с таким названием уже существует');
    }

    const created = await this.prisma.room.create({
      data: { ...dto },
    });

    await this.notifications.log({
      entity: NotificationEntity.ROOM,
      action: NotificationAction.CREATED,
      entityId: created.id,
      title: created.name,
      actorId,
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, dto: UpdateRoomDto, actorId?: number) {
    const existingRoom = await this.getOne(id);

    if (dto.name && dto.name !== existingRoom.data.name) {
      const existingName = await this.prisma.room.findFirst({
        where: {
          name: dto.name,
          NOT: {
            id,
          },
        },
      });

      if (existingName) {
        throw new ConflictException('Кабинет с таким названием уже существует');
      }
    }

    const changes = buildChanges(existingRoom.data,dto, ROOM_LABELS);

    const updated = await this.prisma.room.update({
      where: { id },
      data: { ...dto },
    });

    if (changes.length) {
      await this.notifications.log({
        entity: NotificationEntity.ROOM,
        action: NotificationAction.UPDATED,
        entityId: updated.id,
        title: updated.name,
        message: changes.join('; ').trim(),
        actorId,
      });
    }

    return {
      success: true,
      data: updated,
    };
  }

  async changeStatus(id: number, status: Status, actorId?: number) {
    const before = await this.getOne(id);

    const updated = await this.prisma.room.update({
      where: { id },
      data: { status },
    });

    await this.notifications.log({
      entity: NotificationEntity.ROOM,
      action: NotificationAction.UPDATED,
      entityId: updated.id,
      title: updated.name,
      message: `Статус: ${before.data.status} → ${status}`,
      actorId,
    });

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: number, actorId?: number) {
    await this.getOne(id);

    const deleted = await this.prisma.room.delete({
      where: { id },
    });

    await this.notifications.log({
      entity: NotificationEntity.USER,
      action: NotificationAction.DELETED,
      entityId: id,
      title: deleted.name,
      actorId,
    });

    return {
      success: true,
      data: deleted,
    };
  }
}
