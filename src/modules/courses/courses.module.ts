import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  providers: [CoursesService, NotificationsService],
  controllers: [CoursesController],
})
export class CoursesModule {}
