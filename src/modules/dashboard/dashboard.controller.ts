import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @ApiBearerAuth('accessToken')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  getOverview() {
    return this.service.getOverview();
  }
}
