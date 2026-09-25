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
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role, Status } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { QuaryRoomDto } from './dto/quary-room.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '@/common/interfaces/current-user.interface';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  async getAll(@Query() query: QuaryRoomDto) {
    return await this.service.getAll(query);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  async create(
    @Body() dto: CreateRoomDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return await this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return await this.service.update(id, dto, actor.id);
  }

  @Patch(':id/status')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('status', new ParseEnumPipe(Status))
    status: Status,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return await this.service.changeStatus(id, status, actor.id);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  async delete(
    @Param('id') id: number,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return await this.service.delete(id, actor.id);
  }
}
