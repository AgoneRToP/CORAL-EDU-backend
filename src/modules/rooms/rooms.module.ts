import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  providers: [RoomsService, NotificationsService],
  controllers: [RoomsController],
})
export class RoomsModule {}
