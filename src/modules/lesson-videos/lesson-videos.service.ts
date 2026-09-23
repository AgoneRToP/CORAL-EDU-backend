import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateLessonVideoDto } from './dto/create-lesson-video.dto';
import { QueryLessonVideoDto } from './dto/quary-lesson-video.dto';
import { UpdateLessonVideoDto } from './dto/update-lesson-video.dto';
import { join } from 'path';
import { unlink } from 'fs/promises';

@Injectable()
export class LessonVideosService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: QueryLessonVideoDto) {
    const { page = 1, limit = 10, lessonId, groupId } = query;

    const where: Prisma.LessonVideoWhereInput = {
      ...(lessonId && { lessonId }),
      ...(groupId && { lesson: { groupId } }),
    };

    const [lessonVideos, total] = await this.prisma.$transaction([
      this.prisma.lessonVideo.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.lessonVideo.count({ where }),
    ]);

    return {
      success: true,
      data: lessonVideos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number) {
    const lessonVideo = await this.prisma.lessonVideo.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });

    if (!lessonVideo) {
      throw new NotFoundException('Видео не найдено');
    }

    return {
      success: true,
      data: lessonVideo,
    };
  }

  async create(dto: CreateLessonVideoDto, file: Express.Multer.File) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Урок не найден');
    }

    const sizeMb = Number((file.size / (1024 * 1024)).toFixed(2));

    const created = await this.prisma.lessonVideo.create({
      data: {
        originalName: file.originalname,
        videoUrl: `/uploads/videos/${file.filename}`,
        sizeMb,
        lessonId: lesson.id,
      },
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: created,
    };
  }

  async update(
    id: number,
    dto: UpdateLessonVideoDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.getOne(id);
    const currentVideo = existing.data;

    const data: Prisma.LessonVideoUpdateInput = { ...dto };

    if (file) {
      data.sizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
      data.videoUrl = `/uploads/videos/${file.filename}`;
      data.originalName = dto.originalName ?? file.originalname;

      await this.removeVideoFile(currentVideo.videoUrl);
    }

    const updated = await this.prisma.lessonVideo.update({
      where: { id },
      data,
      include: this.defaultInclude(),
    });

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: number) {
    const existing = await this.getOne(id);

    const deleted = await this.prisma.lessonVideo.delete({
      where: { id },
    });

    await this.removeVideoFile(existing.data.videoUrl);

    return {
      success: true,
      data: deleted,
    };
  }

  private async removeVideoFile(videoUrl: string) {
    try {
      const filePath = join(process.cwd(), videoUrl);
      await unlink(filePath);
    } catch (err) {
      console.warn(`Не удалось удалить старый файл видео: ${videoUrl}`, err);
    }
  }

  private defaultInclude() {
    return {
      lesson: {
        select: { id: true, topic: true, groupId: true },
      },
    } satisfies Prisma.LessonVideoInclude;
  }
}
