import { PrismaService } from '@/core/database/prisma.service';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationAction,
  NotificationEntity,
  Prisma,
  Role,
} from '@prisma/client';
import { QuaryUserDto } from './dto/quary-user.dto';
import { ChangeStatusUserDto } from './dto/change-status-user.dto';
import * as argon from 'argon2';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyEmailDto } from './dto/verify-email-user.dto';
import { MailService } from '@/core/mail/mail.service';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { randomInt } from 'node:crypto';
import { CurrentUserPayload } from '@/common/interfaces/current-user.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { USER_LABELS } from './user.constants';
import { buildChanges } from '@/common/utils/build-changes';

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  async getAll(query: QuaryUserDto, currentUser?: CurrentUserPayload) {
    const { status, role, search, page = 1, limit = 10 } = query;

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { surname: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role }),
      ...(status && { status }),
      ...(!role && { role: { not: Role.SUPERADMIN } }),
    };

    if (currentUser?.role === Role.TEACHER) {
      if (role !== Role.STUDENT) {
        return {
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }

      where.groupStudents = {
        some: {
          group: {
            groupTeachers: {
              some: { teacherId: currentUser.id },
            },
          },
        },
      };
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        omit: { password: true, verificationCode: true },
        orderBy: { created_at: 'desc' },
      }),

      this.prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: number, role: Role) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: {
          ...(role && { equals: role }),
          not: Role.SUPERADMIN,
        },
      },
      omit: {
        password: true,
        verificationCode: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return {
      success: true,
      data: user,
    };
  }

  async create(
    dto: CreateUserDto,
    photo?: Express.Multer.File,
    actorId?: number,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.phone }, { email: dto.email }],
      },
    });

    if (existing) {
      if (existing.phone === dto.phone) {
        throw new ConflictException('Этот номер телефона уже зарегистрирован');
      }

      if (existing.email === dto.email) {
        throw new ConflictException(
          'Эта электронная почта уже зарегистрирована',
        );
      }
    }

    const hashedPassword = await argon.hash(dto.password);

    const isEmailSignup = Boolean(dto.email);

    const verificationCode = isEmailSignup
      ? this.generateVerificationCode()
      : undefined;
    const verificationCodeExpiresAt = isEmailSignup
      ? new Date(Date.now() + VERIFICATION_CODE_TTL_MS)
      : undefined;

    const created = await this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
        photo: photo?.filename,
        status: isEmailSignup ? 'INACTIVE' : 'ACTIVE',
        ...(isEmailSignup && {
          verificationCode,
          verificationCodeExpiresAt,
        }),
      },
      omit: {
        password: true,
        verificationCode: true,
      },
    });

    if (isEmailSignup && verificationCode) {
      try {
        await this.mailService.sendVerificationCode(
          dto.email!,
          verificationCode,
        );
      } catch (err) {
        console.error('Не удалось отправить письмо с кодом:', err);
      }
    }

    await this.notifications.log({
      entity: NotificationEntity.USER,
      action: NotificationAction.CREATED,
      entityId: created.id,
      title:
        `${created.surname ?? ''} ${created.name} (${created.role})`.trim(),
      actorId,
    });

    return {
      success: true,
      data: created,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.status === 'ACTIVE') {
      throw new ConflictException('Аккаунт уже подтверждён');
    }

    const isExpired =
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date();

    if (!user.verificationCode || user.verificationCode !== dto.code) {
      throw new ForbiddenException('Неверный код подтверждения');
    }

    if (isExpired) {
      throw new ForbiddenException(
        'Код устарел, запросите новый код подтверждения',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'ACTIVE',
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
      omit: {
        password: true,
        verificationCode: true,
      },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async resendVerificationCode(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.status === 'ACTIVE') {
      throw new ConflictException('Аккаунт уже подтверждён');
    }

    const verificationCode = this.generateVerificationCode();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationCodeExpiresAt: new Date(
          Date.now() + VERIFICATION_CODE_TTL_MS,
        ),
      },
    });

    await this.mailService.sendVerificationCode(email, verificationCode);

    return { success: true };
  }

  private generateVerificationCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    photo?: Express.Multer.File,
    actorId?: number,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (dto.phone && dto.phone !== existingUser.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id } },
      });

      if (existingPhone) {
        throw new ConflictException(
          'Пользователь с таким номером телефона уже существует',
        );
      }
    }

    if (dto.email && dto.email !== existingUser.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });

      if (existingEmail) {
        throw new ConflictException(
          'Пользователь с таким адресом электронной почты уже существует',
        );
      }
    }

    const { password, removePhoto, ...rest } = dto;

    const data: Prisma.UserUpdateInput = {
      ...rest,
    };

    if (password) {
      data.password = await argon.hash(password);
    }

    if (photo) {
      if (existingUser.photo) {
        await this.deletePhotoFile(existingUser.photo);
      }
      data.photo = photo.filename;
    } else if (removePhoto && existingUser.photo) {
      await this.deletePhotoFile(existingUser.photo);
      data.photo = null;
    }

    const changes = buildChanges(existingUser, rest, USER_LABELS);

    const hadPhoto = !!existingUser.photo;

    if (password) changes.push('Пароль изменён');
    if (photo) changes.push(hadPhoto ? 'Фото обновлено' : 'Фото добавлено');
    else if (removePhoto && existingUser.photo) changes.push('Фото удалено');

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      omit: {
        password: true,
        verificationCode: true,
      },
    });

    if (changes.length) {
      await this.notifications.log({
        entity: NotificationEntity.USER,
        action: NotificationAction.UPDATED,
        entityId: updated.id,
        title: `${updated.surname ?? ''} ${updated.name}`.trim(),
        message: changes.join('; '),
        actorId,
      });
    }

    return {
      success: true,
      data: updated,
    };
  }

  private async deletePhotoFile(filename: string) {
    const photoPath = join(process.cwd(), 'uploads', 'avatars', filename);
    if (existsSync(photoPath)) {
      await unlink(photoPath);
    }
  }

  async changeStatus(id: number, query: ChangeStatusUserDto, actorId?: number) {
    const { status, role } = query;

    const before = await this.getOne(id, role);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
    });

    await this.notifications.log({
      entity: NotificationEntity.USER,
      action: NotificationAction.STATUS_CHANGED,
      entityId: id,
      title: `${updated.surname ?? ''} ${updated.name}`.trim(),
      message: `Статус: ${before.data.status} → ${status}`,
      actorId,
    });

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: number, role: Role, req: Role, actorId?: number) {
    const existing = await this.getOne(id, role);

    if (req === Role.ADMIN && existing.data.role === Role.ADMIN) {
      throw new ForbiddenException(
        'Администратор не может удалить другого администратора',
      );
    }

    if (existing.data.photo) {
      await this.deletePhotoFile(existing.data.photo);
    }

    const deleted = await this.prisma.user.delete({ where: { id } });

    await this.notifications.log({
      entity: NotificationEntity.USER,
      action: NotificationAction.DELETED,
      entityId: id,
      title: `${deleted.surname ?? ''} ${deleted.name}`.trim(),
      actorId,
    });

    return {
      success: true,
      data: deleted,
    };
  }
}
