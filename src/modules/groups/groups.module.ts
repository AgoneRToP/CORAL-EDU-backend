import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { NotificationsService } from '../notifications/notifications.service';
 
@Module({
  controllers: [GroupsController],
  providers: [GroupsService, NotificationsService],
  exports: [GroupsService],
})
export class GroupsModule {}
 