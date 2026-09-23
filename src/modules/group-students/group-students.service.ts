import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Role, Status } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateGroupStudentDto } from './dto/create-group-student.dto';
import { QueryGroupStudentDto } from './dto/quary-group.student.dto';
import { UpdateGroupStudentDto } from './dto/update-group-student.dto';

@Injectable()
export class GroupStudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: QueryGroupStudentDto) {
    const { page = 1, limit = 10, groupId, studentId, status } = query;

    const where: Prisma.GroupStudentWhereInput = {
      ...(groupId && { groupId }),
      ...(studentId && { studentId }),
      ...(status && { status }),
    };

    const [groupStudents, total] = await this.prisma.$transaction([
      this.prisma.groupStudent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.groupStudent.count({ where }),
    ]);

    return {
      success: true,
      data: groupStudents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number) {
    const groupStudent = await this.prisma.groupStudent.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!groupStudent) {
      throw new NotFoundException('Запись не найдена');
    }

    return {
      success: true,
      data: groupStudent,
    };
  }

  async create(dto: CreateGroupStudentDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      include: {
        _count: { select: { groupStudents: true } },
      },
    });

    if (!group) {
      throw new NotFoundException(`Группа не найдена`);
    }

    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
    });

    if (!student) {
      throw new NotFoundException(`Пользователь не найден`);
    }

    if (student.role !== Role.STUDENT) {
      throw new BadRequestException(`Пользователь не студент`);
    }

    const existing = await this.prisma.groupStudent.findUnique({
      where: {
        studentId_groupId: {
          studentId: dto.studentId,
          groupId: dto.groupId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Студент уже состоит в этой группе');
    }

    if (group._count.groupStudents >= group.maxStudent) {
      throw new BadRequestException('В группе нет свободных мест');
    }

    const created = await this.prisma.groupStudent.create({
      data: {
        studentId: dto.studentId,
        groupId: dto.groupId,
      },
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, dto: UpdateGroupStudentDto) {
    await this.getOne(id);

    const updated = await this.prisma.groupStudent.update({
      where: { id },
      data: { status: dto.status },
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: updated,
    };
  }

  async changeStatus(id: number, status: Status) {
    await this.getOne(id);

    const updated = await this.prisma.groupStudent.update({
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

    const deleted = await this.prisma.groupStudent.delete({
      where: { id },
    });

    return {
      success: true,
      data: deleted,
    };
  }

  private defaultInclude() {
    return {
      student: {
        select: {
          id: true,
          name: true,
          surname: true,
          phone: true,
          email: true,
        },
      },
      group: {
        select: { id: true, name: true, status: true },
      },
    } satisfies Prisma.GroupStudentInclude;
  }
}
