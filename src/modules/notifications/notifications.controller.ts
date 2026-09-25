import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Sse,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { interval, map, merge, Observable } from 'rxjs';

@ApiTags('Notifications')
@Controller('notifications')
@Roles(Role.SUPERADMIN, Role.ADMIN)
@ApiBearerAuth('accessToken')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  getAll(@Query() query: QueryNotificationDto) {
    return this.service.getAll(query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  getUnreadCount() {
    return this.service.getUnreadCount();
  }

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    const updates = this.service
      .unreadStream()
      .pipe(map((res) => ({ type: 'unread', data: res.data }) as MessageEvent));

    const heartbeat = interval(25_000).pipe(
      map(() => ({ type: 'ping', data: {} }) as MessageEvent),
    );

    return merge(updates, heartbeat);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  markRead(@Param('id', ParseIntPipe) id: number) {
    return this.service.markRead(id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'SUPERADMIN, ADMIN' })
  markAllRead() {
    return this.service.markAllRead();
  }
}
