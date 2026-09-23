import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { QueryLessonDto } from './dto/quary-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: QueryLessonDto) {
    const { page = 1, limit = 10, search, groupId, userId, status } = query;

    const where: Prisma.LessonWhereInput = {
      ...(search && { topic: { contains: search, mode: 'insensitive' } }),
      ...(groupId && { groupId }),
      ...(userId && { userId }),
      ...(status && { status }),
    };

    const [lessons, total] = await this.prisma.$transaction([
      this.prisma.lesson.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.lesson.count({ where }),
    ]);

    return {
      success: true,
      data: lessons,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!lesson) {
      throw new NotFoundException('Урок не найден');
    }

    return {
      success: true,
      data: lesson,
    };
  }

  async create(dto: CreateLessonDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
    });

    if (!group) {
      throw new NotFoundException(`Группа не найдена`);
    }

    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!teacher) {
      throw new NotFoundException(`Пользователь не найден`);
    }

    if (teacher.role !== Role.TEACHER) {
      throw new BadRequestException(
        `Пользователь не преподаватель`,
      );
    }

    const isAssigned = await this.prisma.groupTeacher.findUnique({
      where: {
        teacherId_groupId: {
          teacherId: dto.userId,
          groupId: dto.groupId,
        },
      },
    });

    if (!isAssigned) {
      throw new BadRequestException(
        'Этот преподаватель не привязан к указанной группе',
      );
    }

    const created = await this.prisma.lesson.create({
      data: {
        topic: dto.topic,
        description: dto.description,
        userId: dto.userId,
        groupId: dto.groupId,
      },
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, dto: UpdateLessonDto) {
    await this.getOne(id);

    const updated = await this.prisma.lesson.update({
      where: { id },
      data: dto,
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: number) {
    await this.getOne(id);

    const deleted = await this.prisma.lesson.delete({
      where: { id },
    });

    return {
      succes: true,
      data: deleted,
    };
  }

  private defaultInclude() {
    return {
      user: {
        select: { id: true, name: true, surname: true },
      },
      group: {
        select: { id: true, name: true, status: true },
      },
      _count: {
        select: { homeworks: true, lessonVideos: true },
      },
    } satisfies Prisma.LessonInclude;
  }
}
