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
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { QueryGroupDto } from './dto/query-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role, GroupStatus } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import type { CurrentUserPayload } from '@/common/interfaces/current-user.interface';
import type { Request } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN, TEACHER, STUDENT' })
  getAll(@Query() query: QueryGroupDto, @Req() req: Request) {
    const rawUser = req.user as CurrentUserPayload | undefined;
    const currentUser: CurrentUserPayload | undefined = rawUser
      ? { id: rawUser.id, role: rawUser.role }
      : undefined;

    return this.service.getAll(query, currentUser);
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
  create(
    @Body() dto: CreateGroupDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Patch(':id/status')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('status', new ParseEnumPipe(GroupStatus))
    status: GroupStatus,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return await this.service.changeStatus(id, status, actor.id);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return this.service.delete(id, actor.id);
  }
}
