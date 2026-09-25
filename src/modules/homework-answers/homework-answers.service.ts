import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { QueryHomeworkAnswerDto } from './dto/quary-homework-answers.dto';
import { CreateHomeworkAnswerDto } from './dto/create-homework-answers.dto';
import { UpdateHomeworkAnswerDto } from './dto/update-homework-answers.dto';
import { join } from 'path';
import { unlink } from 'fs/promises';

@Injectable()
export class HomeworkAnswersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: QueryHomeworkAnswerDto) {
    const {
      page = 1,
      limit = 10,
      homeworkId,
      studentId,
      groupId,
      lessonId,
      homeworkStatus,
    } = query;

    const where: Prisma.HomeworkAnswerWhereInput = {
      ...(homeworkId && { homeworkId }),
      ...(studentId && { studentId }),
      ...(lessonId && { homework: { lessonId } }),
      ...(!lessonId && groupId && { homework: { lesson: { groupId } } }),
      ...(homeworkStatus && { homeworkStatus }),
    };

    const [answers, total] = await this.prisma.$transaction([
      this.prisma.homeworkAnswer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.homeworkAnswer.count({ where }),
    ]);

    return {
      success: true,
      data: answers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number) {
    const answer = await this.prisma.homeworkAnswer.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!answer) {
      throw new NotFoundException('Ответ на домашнее задание не найден');
    }

    return {
      success: true,
      data: answer,
    };
  }

  async create(dto: CreateHomeworkAnswerDto, file?: Express.Multer.File) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: dto.homeworkId },
      include: { lesson: { select: { groupId: true } } },
    });

    if (!homework) {
      throw new NotFoundException('Домашнее задание не найдено');
    }

    await this.ensureStudentEnrolledInGroup(
      dto.studentId,
      homework.lesson.groupId,
    );

    const created = await this.prisma.homeworkAnswer.create({
      data: {
        title: dto.title ?? file?.originalname ?? '',
        file: `/uploads/homework-answers/${file?.filename}`,
        studentId: dto.studentId,
        homeworkId: homework.id,
      },
      include: this.defaultInclude(),
    });

    return { success: true, data: created };
  }

  async update(
    id: number,
    dto: UpdateHomeworkAnswerDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.getOne(id);

    const data: Prisma.HomeworkAnswerUpdateInput = { ...dto };

    if (file) {
      data.file = `/uploads/homework-answers/${file.filename}`;
      data.title = dto.title ?? file.originalname;
      await this.removeAnswerFile(existing.data.file ?? '');
    }

    const updated = await this.prisma.homeworkAnswer.update({
      where: { id },
      data,
      include: this.defaultInclude(),
    });

    return { success: true, data: updated };
  }

  async delete(id: number) {
    const existing = await this.getOne(id);

    const deleted = await this.prisma.homeworkAnswer.delete({ where: { id } });

    await this.removeAnswerFile(existing.data.file ?? '');

    return { success: true, data: deleted };
  }

  private async removeAnswerFile(fileUrl: string) {
    if (fileUrl) {
      try {
        await unlink(join(process.cwd(), fileUrl));
      } catch (err) {
        console.warn(`Не удалось удалить файл ответа: ${fileUrl}`, err);
      }
    }
  }

  private async ensureStudentEnrolledInGroup(
    studentId: number,
    groupId: number,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(`Пользователь не найден`);
    }

    if (student.role !== Role.STUDENT) {
      throw new BadRequestException(`Пользователь не студент`);
    }

    const isEnrolled = await this.prisma.groupStudent.findUnique({
      where: { studentId_groupId: { studentId, groupId } },
    });

    if (!isEnrolled) {
      throw new BadRequestException(
        `Студент не состоит в группе, которой принадлежит домашнее задание`,
      );
    }
  }

  private defaultInclude() {
    return {
      student: {
        select: { id: true, name: true, surname: true },
      },
      homework: {
        select: {
          id: true,
          title: true,
          lesson: { select: { id: true, groupId: true } },
        },
      },
    } satisfies Prisma.HomeworkAnswerInclude;
  }
}
