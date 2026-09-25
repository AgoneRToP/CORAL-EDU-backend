import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { QuaryUserDto } from './dto/quary-user.dto';
import { ChangeStatusUserDto } from './dto/change-status-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from '@/common/decorators/public.decorator';
import { VerifyEmailDto } from './dto/verify-email-user.dto';
import type { Request } from 'express';
import type { CurrentUserPayload } from '@/common/interfaces/current-user.interface';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN, TEACHER' })
  async getAll(@Query() query: QuaryUserDto, @Req() req: Request) {
    const rawUser = req.user as CurrentUserPayload | undefined;
    const currentUser: CurrentUserPayload | undefined = rawUser
      ? { id: rawUser.id, role: rawUser.role }
      : undefined;

    return await this.service.getAll(query, currentUser);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('role', new ParseEnumPipe(Role, { optional: true }))
    role: Role,
  ) {
    return this.service.getOne(id, role);
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() dto: CreateUserDto,
    @UploadedFile() photo: Express.Multer.File,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return await this.service.create(dto, photo, actor.id);
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.service.verifyEmail(dto);
  }

  @Public()
  @Post('resend-code')
  resendCode(@Body('email') email: string) {
    return this.service.resendVerificationCode(email);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @UploadedFile() photo: Express.Multer.File,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return await this.service.update(id, dto, photo, actor.id);
  }

  @Patch(':id/status')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ChangeStatusUserDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return await this.service.changeStatus(id, query, actor.id);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  async delete(
    @Param('id') id: number,
    @Query('role', new ParseEnumPipe(Role, { optional: true }))
    role: Role,
    @Req() req: any,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return await this.service.delete(id, role, req.user.role, actor.id);
  }
}
