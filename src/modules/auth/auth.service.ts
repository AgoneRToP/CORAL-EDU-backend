import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Status, User, Prisma } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { JWTAccessOptions, JWTRefreshOptions } from '@/common/config/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async verifyPassword(
    hashedPassword: string,
    originalPassword: string,
  ) {
    return await argon.verify(hashedPassword, originalPassword);
  }

  async generateToken(
    user: Pick<User, 'id' | 'role' | 'email'>,
    accessTokenOnly?: boolean,
  ) {
    const tokens: { accessToken?: string; refreshToken?: string } = {
      accessToken: undefined,
      refreshToken: undefined,
    };

    tokens.accessToken = await this.jwtService.signAsync(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWTAccessOptions,
    );

    if (!accessTokenOnly) {
      tokens.refreshToken = await this.jwtService.signAsync(
        { id: user.id },
        JWTRefreshOptions,
      );
    } else {
      delete tokens.refreshToken;
    }

    return tokens;
  }

  async login(dto: LoginDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.phone ? { phone: dto.phone.toLowerCase() } : undefined,
          dto.email ? { email: dto.email.toLowerCase() } : undefined,
        ].filter(Boolean) as Prisma.UserWhereInput[],
      },
    });

    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Пожалуйста, введите логин');
    }

    if (!existing) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (existing.status !== Status.ACTIVE) {
      throw new ForbiddenException('Пользователь заблокирован или неактивен');
    }

    const isSame = await this.verifyPassword(
      existing.password,
      dto.password,
    );

    if (!isSame) {
      throw new BadRequestException('Неверный пароль');
    }

    const { password, ...result } = existing;

    return {
      success: true,
      tokens: await this.generateToken(result),
      data: result,
    };
  }

  async refreshTokens(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== Status.ACTIVE) {
      throw new ForbiddenException('Пользователь не найден или неактивен');
    }
    return this.generateToken(user);
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    const { password, ...result } = user;
    return result;
  }
}
