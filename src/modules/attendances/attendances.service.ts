import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendances.dto';
import { BulkCreateAttendanceDto } from './dto/bulk-create-attendances.dto';
import { QueryAttendanceDto } from './dto/quary-attendances.dto';
import { UpdateAttendanceDto } from './dto/update-attendances.dto';

@Injectable()
export class AttendancesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: QueryAttendanceDto) {
    const {
      page = 1,
      limit = 10,
      groupId,
      lessonId,
      studentId,
      userId,
      isPresent,
    } = query;

    const where: Prisma.AttendanceWhereInput = {
      ...(groupId && { groupId }),
      ...(lessonId && { lessonId }),
      ...(studentId && { studentId }),
      ...(userId && { userId }),
      ...(isPresent !== undefined && { isPresent }),
    };

    const [attendances, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      success: true,
      data: attendances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!attendance) {
      throw new NotFoundException('Запись посещаемости не найдена');
    }

    return {
      success: true,
      data: attendance,
    };
  }

  async create(dto: CreateAttendanceDto) {
    const lesson = await this.getLessonOrThrow(dto.lessonId);
    await this.ensureTeacherAssignedToGroup(dto.userId, lesson.groupId);
    await this.ensureStudentEnrolledInGroup(dto.studentId, lesson.groupId);
    await this.ensureNoDuplicate(dto.studentId, dto.lessonId);

    const created = await this.prisma.attendance.create({
      data: {
        isPresent: dto.isPresent,
        userId: dto.userId,
        studentId: dto.studentId,
        lessonId: lesson.id,
      },
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: created,
    };
  }

  async bulkCreate(dto: BulkCreateAttendanceDto) {
    const lesson = await this.getLessonOrThrow(dto.lessonId);
    await this.ensureTeacherAssignedToGroup(dto.userId, lesson.groupId);

    for (const entry of dto.students) {
      await this.ensureStudentEnrolledInGroup(entry.studentId, lesson.groupId);
      await this.ensureNoDuplicate(entry.studentId, dto.lessonId);
    }

    const created = await this.prisma.$transaction(
      dto.students.map((entry) =>
        this.prisma.attendance.create({
          data: {
            isPresent: entry.isPresent,
            userId: dto.userId,
            studentId: entry.studentId,
            lessonId: lesson.id,
          },
          include: this.defaultInclude(),
        }),
      ),
    );

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, dto: UpdateAttendanceDto) {
    await this.getOne(id);

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: { isPresent: dto.isPresent },
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: number) {
    await this.getOne(id);

    const deleted = await this.prisma.attendance.delete({
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

  private async ensureNoDuplicate(studentId: number, lessonId: number) {
    const existing = await this.prisma.attendance.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
    });

    if (existing) {
      throw new ConflictException(
        `Посещаемость студента на этом уроке уже отмечена`,
      );
    }
  }

  private async ensureTeacherAssignedToGroup(userId: number, groupId: number) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!teacher) {
      throw new NotFoundException(`Пользователь не найден`);
    }

    if (teacher.role !== Role.TEACHER) {
      throw new BadRequestException(`Пользователь не преподаватель`);
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
        `Студент не состоит в группе, которой принадлежит урок`,
      );
    }
  }

  private defaultInclude() {
    return {
      user: {
        select: { id: true, name: true, surname: true },
      },
      student: {
        select: { id: true, name: true, surname: true },
      },
      lesson: {
        select: { id: true, topic: true, groupId: true },
      },
    } satisfies Prisma.AttendanceInclude;
  }
}
