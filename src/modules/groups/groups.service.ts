import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Course, GroupStatus, Prisma, Role, Week } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { QueryGroupDto } from './dto/query-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CurrentUserPayload } from '@/common/interfaces/current-user.interface';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

    async getAll(query: QueryGroupDto, currentUser?: CurrentUserPayload) {
    const { page = 1, limit = 10, search, status, week, courseId, roomId } =
      query;
 
    const where: Prisma.GroupWhereInput = {
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),
      ...(status && { status }),
      ...(week && {
        week: {
          has: week,
        },
      }),
      ...(courseId && { courseId }),
      ...(roomId && { roomId }),
    };
 
    if (currentUser?.role === Role.TEACHER) {
      where.groupTeachers = {
        some: { teacherId: currentUser.id },
      };
    }
 
    const [groups, total] = await this.prisma.$transaction([
      this.prisma.group.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
        include: this.defaultInclude(),
      }),
      this.prisma.group.count({
        where,
      }),
    ]);
 
    return {
      success: true,
      data: groups,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  async getOne(id: number) {
    const group = await this.prisma.group.findUnique({
      where: {
        id,
      },

      include: this.defaultInclude(),
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    return {
      success: true,
      data: group,
    };
  }

  async create(dto: CreateGroupDto) {
    const course = await this.ensureCourseExists(dto.courseId);

    await this.ensureRoomExists(dto.roomId);

    const existingByName = await this.prisma.group.findUnique({
      where: {
        name: dto.name,
      },
    });

    if (existingByName) {
      throw new ConflictException('Группа с таким названием уже существует');
    }

    const startDate = new Date(dto.startDate);

    if (Number.isNaN(startDate.getTime())) {
      throw new ConflictException('Некорректная дата начала группы');
    }

    await this.ensureRoomAvailability({
      roomId: dto.roomId,

      week: dto.week,

      startDate,

      startTime: dto.startTime,

      durationHours: course.durationHours,

      durationMonths: course.durationMonths,
    });

    const created = await this.prisma.group.create({
      data: {
        name: dto.name,

        startDate,

        startTime: dto.startTime,

        maxStudent: dto.maxStudent,

        week: dto.week,

        description: dto.description,

        courseId: dto.courseId,

        roomId: dto.roomId,
      },

      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, dto: UpdateGroupDto) {
    const existing = await this.getOne(id);

    const current = existing.data;

    let course: Course = current.course;

    if (dto.courseId !== undefined) {
      course = await this.ensureCourseExists(dto.courseId);
    }

    if (dto.roomId !== undefined) {
      await this.ensureRoomExists(dto.roomId);
    }

    if (dto.name !== undefined) {
      const existingByName = await this.prisma.group.findUnique({
        where: {
          name: dto.name,
        },
      });

      if (existingByName && existingByName.id !== id) {
        throw new ConflictException('Группа с таким названием уже существует');
      }
    }

    const roomId = dto.roomId ?? current.roomId;

    const week = dto.week ?? current.week;

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : current.startDate;

    const startTime = dto.startTime ?? current.startTime;

    if (Number.isNaN(startDate.getTime())) {
      throw new ConflictException('Некорректная дата начала группы');
    }

    await this.ensureRoomAvailability({
      roomId,

      week,

      startDate,

      startTime,

      durationHours: course.durationHours,

      durationMonths: course.durationMonths,

      excludeGroupId: id,
    });

    const updated = await this.prisma.group.update({
      where: {
        id,
      },

      data: {
        ...dto,

        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      },

      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: updated,
    };
  }

  async changeStatus(id: number, status: GroupStatus) {
    await this.getOne(id);

    const updated = await this.prisma.group.update({
      where: {
        id,
      },

      data: {
        status,
      },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: number) {
    await this.getOne(id);

    const deleted = await this.prisma.group.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      data: deleted,
    };
  }

  private async ensureCourseExists(courseId: number): Promise<Course> {
    const course = await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    return course;
  }

  private async ensureRoomExists(roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: {
        id: roomId,
      },
    });

    if (!room) {
      throw new NotFoundException('Кабинет не найден');
    }

    return room;
  }

  private async ensureRoomAvailability(params: {
    roomId: number;
    week: Week[];
    startDate: Date;
    startTime: string;
    durationHours: number;
    durationMonths: number;
    excludeGroupId?: number;
  }) {
    const {
      roomId,
      week,
      startDate,
      startTime,
      durationHours,
      durationMonths,
      excludeGroupId,
    } = params;

    const newEndDate = this.addMonths(startDate, durationMonths);

    const newStartMin = this.timeToMinutes(startTime);

    const newEndMin = newStartMin + durationHours * 60;

    const candidates = await this.prisma.group.findMany({
      where: {
        roomId,
        status: {
          not: GroupStatus.INACTIVE,
        },
        ...(excludeGroupId !== undefined && {
          id: {
            not: excludeGroupId,
          },
        }),
      },

      include: {
        course: true,
        room: true,
      },
    });

    const daysInRussian = {
      MONDAY: 'Понедельник',
      TUESDAY: 'Вторник',
      WEDNESDAY: 'Среда',
      THURSDAY: 'Четверг',
      FRIDAY: 'Пятница',
      SATURDAY: 'Суббота',
      SUNDAY: 'Воскресенье',
    };

    for (const group of candidates) {
      const sharedDays = group.week.filter((day) => week.includes(day));

      if (sharedDays.length === 0) {
        continue;
      }

      const sharedDaysRu = sharedDays.map(
        (day) => daysInRussian[day.toUpperCase()] || day,
      );

      const existingEndDate = this.addMonths(
        group.startDate,
        group.course.durationMonths,
      );

      const datesOverlap =
        startDate < existingEndDate && group.startDate < newEndDate;

      if (!datesOverlap) {
        continue;
      }

      const existingStartMin = this.timeToMinutes(group.startTime);

      const existingEndMin = existingStartMin + group.course.durationHours * 60;

      const timesOverlap =
        newStartMin < existingEndMin && existingStartMin < newEndMin;

      if (!timesOverlap) {
        continue;
      }

      const roomName = group.room?.name ?? `ID ${roomId}`;

      const existingEndTime = this.minutesToTime(existingEndMin);

      const newEndTime = this.minutesToTime(newEndMin);

      throw new ConflictException(
        `Кабинет "${roomName}" уже занят группой "${group.name}". ` +
          `Пересечение: ${sharedDaysRu.join(', ')}. ` +
          `Существующая группа: ${group.startTime}–${existingEndTime}. ` +
          `Новая группа: ${startTime}–${newEndTime}.`,
      );
    }
  }

  private defaultInclude() {
    return {
      course: true,
      room: true,
      groupTeachers: {
        where: { status: 'ACTIVE' },
        include: {
          teacher: {
            select: { id: true, name: true, surname: true },
          },
        },
      },
      _count: {
        select: {
          groupStudents: { where: { status: 'ACTIVE' } },
        },
      },
    } satisfies Prisma.GroupInclude;
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);

    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const normalized = minutes % (24 * 60);

    const hours = Math.floor(normalized / 60);

    const mins = normalized % 60;

    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);

    result.setMonth(result.getMonth() + months);

    return result;
  }
}
