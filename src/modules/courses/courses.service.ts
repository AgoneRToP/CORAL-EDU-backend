import { PrismaService } from '@/core/database/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuaryCourseDto } from './dto/quary-course.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { Prisma, Status } from '@prisma/client';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(payload: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { name: payload.name },
    });

    if (existing) {
      throw new ConflictException('Курс с таким названием уже существует');
    }

    const created = await this.prisma.course.create({
      data: { ...payload },
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(id: number, payload: UpdateCourseDto) {
    const existingCourse = await this.getOne(id);

    if (payload.name && payload.name !== existingCourse.data.name) {
      const existingName = await this.prisma.course.findFirst({
        where: {
          name: payload.name,
          NOT: {
            id,
          },
        },
      });

      if (existingName) {
        throw new ConflictException('Курс с таким названием уже существует');
      }
    }

    const updated = await this.prisma.course.update({
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

    const updated = await this.prisma.course.update({
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

    const deleted = await this.prisma.course.delete({
      where: { id },
    });

    return {
      success: true,
      data: deleted,
    };
  }
}
