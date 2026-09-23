import { PrismaService } from '@/core/database/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuaryRoomDto } from './dto/quary-room.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { Prisma, Status } from '@prisma/client';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(payload: CreateRoomDto) {
    const existing = await this.prisma.room.findUnique({
      where: { name: payload.name },
    });

    if (existing) {
      throw new ConflictException('Кабинет с таким названием уже существует');
    }

    const created = await this.prisma.room.create({
      data: { ...payload },
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, payload: UpdateRoomDto) {
    const existingRoom = await this.getOne(id);

    if (payload.name && payload.name !== existingRoom.data.name) {
      const existingName = await this.prisma.room.findFirst({
        where: {
          name: payload.name,
          NOT: {
            id,
          },
        },
      });

      if (existingName) {
        throw new ConflictException('Кабинет с таким названием уже существует');
      }
    }

    const updated = await this.prisma.room.update({
      where: { id },
      data: { ...payload },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async changeStatus(id: number, status: Status) {
    await this.getOne(id);

    const updated = await this.prisma.room.update({
      where: { id },
      data: { status },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: number) {
    await this.getOne(id);

    const deleted = await this.prisma.room.delete({
      where: { id },
    });

    return {
      success: true,
      data: deleted,
    };
  }
}
