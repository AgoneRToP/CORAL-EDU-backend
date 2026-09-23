import { PrismaService } from '@/core/database/prisma.service';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { QuaryUserDto } from './dto/quary-user.dto';
import { ChangeStatusUserDto } from './dto/change-status-user.dto';
import * as argon from 'argon2';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyEmailDto } from './dto/verify-email-user.dto';
import { MailService } from '@/core/mail/mail.service'; // путь подстрой под свой проект
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { randomInt } from 'node:crypto';
import { CurrentUserPayload } from '@/common/interfaces/current-user.interface';

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000; // 10 минут

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
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

  async create(payload: CreateUserDto, photo?: Express.Multer.File) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: payload.phone }, { email: payload.email }],
      },
    });

    if (existing) {
      if (existing.phone === payload.phone) {
        throw new ConflictException('Этот номер телефона уже зарегистрирован');
      }

      if (existing.email === payload.email) {
        throw new ConflictException(
          'Эта электронная почта уже зарегистрирована',
        );
      }
    }

    const hashedPassword = await argon.hash(payload.password);

    // Если указан email — считаем это регистрацией через email:
    // аккаунт создаётся неактивным, пока не подтверждён код.
    // Если email не указан (только phone) — активируем сразу.
    const isEmailSignup = Boolean(payload.email);

    const verificationCode = isEmailSignup
      ? this.generateVerificationCode()
      : undefined;
    const verificationCodeExpiresAt = isEmailSignup
      ? new Date(Date.now() + VERIFICATION_CODE_TTL_MS)
      : undefined;

    const created = await this.prisma.user.create({
      data: {
        ...payload,
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
          payload.email!,
          verificationCode,
        );
      } catch (err) {
        // Пользователь уже создан в базе — не рушим весь запрос,
        // если письмо не отправилось. Логируем, чтобы видеть проблему в консоли/мониторинге.
        console.error('Не удалось отправить письмо с кодом:', err);
      }
    }

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
    // 6-значный код: от 100000 до 999999
    return randomInt(100000, 1000000).toString();
  }

  async update(
    id: number,
    payload: UpdateUserDto,
    photo?: Express.Multer.File,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (payload.phone && payload.phone !== existingUser.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: payload.phone, NOT: { id } },
      });

      if (existingPhone) {
        throw new ConflictException(
          'Пользователь с таким номером телефона уже существует',
        );
      }
    }

    if (payload.email && payload.email !== existingUser.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: payload.email, NOT: { id } },
      });

      if (existingEmail) {
        throw new ConflictException(
          'Пользователь с таким адресом электронной почты уже существует',
        );
      }
    }

    const { password, removePhoto, ...rest } = payload;

    const data: Prisma.UserUpdateInput = {
      ...rest,
    };

    if (password) {
      data.password = await argon.hash(password);
    }

    // Новый файл имеет приоритет над флагом удаления
    if (photo) {
      if (existingUser.photo) {
        await this.deletePhotoFile(existingUser.photo);
      }
      data.photo = photo.filename;
    } else if (removePhoto && existingUser.photo) {
      await this.deletePhotoFile(existingUser.photo);
      data.photo = null;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
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

  private async deletePhotoFile(filename: string) {
    const photoPath = join(process.cwd(), 'uploads', 'avatars', filename);
    if (existsSync(photoPath)) {
      await unlink(photoPath);
    }
  }

  async changeStatus(id: number, query: ChangeStatusUserDto) {
    const { status, role } = query;

    await this.getOne(id, role);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: number, role: Role, req: Role) {
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

    return { success: true, data: deleted };
  }
}
