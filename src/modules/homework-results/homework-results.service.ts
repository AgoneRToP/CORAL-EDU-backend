import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { QueryHomeworkResultDto } from './dto/quary-homework-result.dto';
import { CreateHomeworkResultDto } from './dto/create-homework-result.dto';
import { UpdateHomeworkResultDto } from './dto/update-homework-result.dto';

@Injectable()
export class HomeworkResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: QueryHomeworkResultDto) {
    const {
      page = 1,
      limit = 10,
      homeworkId,
      homeworkAnswerId,
      userId,
      groupId,
      homeworkStatus,
    } = query;

    const where: Prisma.HomeworkResultWhereInput = {
      ...(homeworkId && { homeworkId }),
      ...(homeworkAnswerId && { homeworkAnswerId }),
      ...(userId && { userId }),
      ...(groupId && { homework: { lesson: { groupId } } }),
      ...(homeworkStatus && { homeworkStatus }),
    };

    const [results, total] = await this.prisma.$transaction([
      this.prisma.homeworkResult.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.homeworkResult.count({ where }),
    ]);

    return {
      success: true,
      data: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number) {
    const result = await this.prisma.homeworkResult.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!result) {
      throw new NotFoundException('Результат проверки не найден');
    }

    return {
      success: true,
      data: result,
    };
  }

  async create(dto: CreateHomeworkResultDto) {
    const answer = await this.prisma.homeworkAnswer.findUnique({
      where: { id: dto.homeworkAnswerId },
      include: {
        homework: { include: { lesson: { select: { groupId: true } } } },
      },
    });

    if (!answer) {
      throw new NotFoundException(
        `Ответ на домашнее задание не найден`,
      );
    }

    await this.ensureTeacherAssignedToGroup(
      dto.userId,
      answer.homework.lesson.groupId,
    );

    const existing = await this.prisma.homeworkResult.findUnique({
      where: {
        userId_homeworkId_homeworkAnswerId: {
          userId: dto.userId,
          homeworkId: answer.homeworkId,
          homeworkAnswerId: dto.homeworkAnswerId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Этот преподаватель уже выставил оценку за данный ответ',
      );
    }

    const created = await this.prisma.homeworkResult.create({
      data: {
        title: dto.title,
        grade: dto.grade,
        homeworkStatus: dto.homeworkStatus,
        userId: dto.userId,
        homeworkId: answer.homeworkId,
        homeworkAnswerId: dto.homeworkAnswerId,
      },
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, dto: UpdateHomeworkResultDto) {
    await this.getOne(id);

    const updated = await this.prisma.homeworkResult.update({
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

    const deleted = await this.prisma.homeworkResult.delete({
      where: { id },
    });

    return {
      success: true,
      data: deleted,
    };
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
        'Этот преподаватель не привязан к группе, которой принадлежит домашнее задание',
      );
    }
  }

  private defaultInclude() {
    return {
      user: {
        select: { id: true, name: true, surname: true },
      },
      homework: {
        select: { id: true, title: true },
      },
      homeworkAnswer: {
        select: { id: true, title: true, studentId: true },
      },
    } satisfies Prisma.HomeworkResultInclude;
  }
}
