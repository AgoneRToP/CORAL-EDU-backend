import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { QueryHomeworkDto } from './dto/quary-homework.dto';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

@Injectable()
export class HomeworksService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: QueryHomeworkDto) {
    const { page = 1, limit = 10, search, lessonId, groupId, userId } = query;

    const where: Prisma.HomeworkWhereInput = {
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(lessonId && { lessonId }),
      ...(groupId && { lesson: { groupId } }),
      ...(userId && { userId }),
    };

    const [homeworks, total] = await this.prisma.$transaction([
      this.prisma.homework.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.homework.count({ where }),
    ]);

    return {
      success: true,
      data: homeworks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!homework) {
      throw new NotFoundException('Домашнее задание не найдено');
    }

    return {
      success: true,
      data: homework,
    };
  }

  async create(dto: CreateHomeworkDto) {
    const lesson = await this.getLessonOrThrow(dto.lessonId);

    await this.ensureTeacherAssignedToGroup(dto.userId, lesson.groupId);

    const created = await this.prisma.homework.create({
      data: {
        title: dto.title,
        userId: dto.userId,
        lessonId: lesson.id,
      },
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, dto: UpdateHomeworkDto) {
    await this.getOne(id);

    const updated = await this.prisma.homework.update({
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

    const deleted = await this.prisma.homework.delete({
      where: { id },
    });

    return {
      success: true,
      data: deleted,
    };
  }

  private async getLessonOrThrow(lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Урок не найден`);
    }

    return lesson;
  }

  private async ensureTeacherAssignedToGroup(userId: number, groupId: number) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: userId },
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
      where: { teacherId_groupId: { teacherId: userId, groupId } },
    });

    if (!isAssigned) {
      throw new BadRequestException(
        'Этот преподаватель не привязан к группе, которой принадлежит урок',
      );
    }
  }

  private defaultInclude() {
    return {
      user: {
        select: { id: true, name: true, surname: true },
      },
      lesson: {
        select: { id: true, topic: true, groupId: true },
      },
      _count: {
        select: { homeworkAnswers: true, homeworkResults: true },
      },
    } satisfies Prisma.HomeworkInclude;
  }
}
