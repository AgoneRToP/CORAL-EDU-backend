import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Role, Status } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateGroupTeacherDto } from './dto/create-group-teacher.dto';
import { QueryGroupTeacherDto } from './dto/quary-group-teacher.dto';
import { UpdateGroupTeacherDto } from './dto/update-group-teacher.dto';

@Injectable()
export class GroupTeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: QueryGroupTeacherDto) {
    const { page = 1, limit = 10, groupId, teacherId, status } = query;

    const where: Prisma.GroupTeacherWhereInput = {
      ...(groupId && { groupId }),
      ...(teacherId && { teacherId }),
      ...(status && { status }),
    };

    const [groupTeachers, total] = await this.prisma.$transaction([
      this.prisma.groupTeacher.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.groupTeacher.count({ where }),
    ]);

    return {
      success: true,
      data: groupTeachers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number) {
    const groupTeacher = await this.prisma.groupTeacher.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!groupTeacher) {
      throw new NotFoundException('Запись не найдена');
    }

    return {
      success: true,
      data: groupTeacher,
    };
  }

  async create(dto: CreateGroupTeacherDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
    });

    if (!group) {
      throw new NotFoundException(`Группа не найдена`);
    }

    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
    });

    if (!teacher) {
      throw new NotFoundException(`Пользователь не найден`);
    }

    if (teacher.role !== Role.TEACHER) {
      throw new BadRequestException(`Пользователь не преподаватель`);
    }

    const existing = await this.prisma.groupTeacher.findUnique({
      where: {
        teacherId_groupId: {
          teacherId: dto.teacherId,
          groupId: dto.groupId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Преподаватель уже привязан к этой группе');
    }

    const created = await this.prisma.groupTeacher.create({
      data: {
        teacherId: dto.teacherId,
        groupId: dto.groupId,
      },
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, dto: UpdateGroupTeacherDto) {
    await this.getOne(id);

    const updated = await this.prisma.groupTeacher.update({
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

    const updated = await this.prisma.groupTeacher.update({
      where: { id },
      data: { status },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: number) {
    const group = await this.getOne(id);

    await this.prisma.groupTeacher.delete({
      where: { id },
    });

    return {
      success: true,
      data: group.data,
    };
  }

  private defaultInclude() {
    return {
      teacher: {
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
    } satisfies Prisma.GroupTeacherInclude;
  }
}
