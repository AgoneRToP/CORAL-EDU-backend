import { PrismaService } from '@/core/database/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuaryCourseDto } from './dto/quary-course.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import {
  NotificationAction,
  NotificationEntity,
  Prisma,
  Status,
} from '@prisma/client';
import { UpdateCourseDto } from './dto/update-course.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { buildChanges } from '@/common/utils/build-changes';
import { COURSE_LABELS } from './course.constants';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getAll(query: QuaryCourseDto) {
    const { status, search, page = 1, limit = 10 } = query;

    const where: Prisma.CourseWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(status && { status }),
    };

    const [courses, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),

      this.prisma.course.count({ where }),
    ]);

    return {
      success: true,
      data: courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number) {
    const course = await this.prisma.course.findFirst({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    return {
      success: true,
      data: course,
    };
  }

  async create(dto: CreateCourseDto, actorId: number) {
    const existing = await this.prisma.course.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Курс с таким названием уже существует');
    }

    const created = await this.prisma.course.create({
      data: { ...dto },
    });

    await this.notifications.log({
      entity: NotificationEntity.COURSE,
      action: NotificationAction.CREATED,
      entityId: created.id,
      title: `${created.name}`.trim(),
      actorId,
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, dto: UpdateCourseDto, actorId: number) {
    const existingCourse = await this.getOne(id);

    if (dto.name && dto.name !== existingCourse.data.name) {
      const existingName = await this.prisma.course.findFirst({
        where: {
          name: dto.name,
          NOT: {
            id,
          },
        },
      });

      if (existingName) {
        throw new ConflictException('Курс с таким названием уже существует');
      }
    }

    const changes = buildChanges(existingCourse.data, dto, COURSE_LABELS);

    const updated = await this.prisma.course.update({
      where: { id },
      data: { ...dto },
    });

    if (changes.length) {
      await this.notifications.log({
        entity: NotificationEntity.COURSE,
        action: NotificationAction.UPDATED,
        entityId: updated.id,
        title: `${updated.name}`.trim(),
        message: changes.join('; ').trim(),
        actorId,
      });
    }

    return {
      success: true,
      data: updated,
    };
  }

  async changeStatus(id: number, status: Status, actorId: number) {
    const before = await this.getOne(id);

    const updated = await this.prisma.course.update({
      where: { id },
      data: { status },
    });

    await this.notifications.log({
      entity: NotificationEntity.ROOM,
      action: NotificationAction.UPDATED,
      entityId: updated.id,
      title: `${updated.name}`.trim(),
      message: `Статус: ${before.data.status} → ${status}`,
      actorId,
    });

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: number, actorId: number) {
    await this.getOne(id);

    const deleted = await this.prisma.course.delete({
      where: { id },
    });

    await this.notifications.log({
      entity: NotificationEntity.COURSE,
      action: NotificationAction.DELETED,
      entityId: id,
      title: `${deleted.name}`.trim(),
      actorId,
    });

    return {
      success: true,
      data: deleted,
    };
  }
}
