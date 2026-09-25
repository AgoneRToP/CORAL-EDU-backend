import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MailModule } from '@/core/mail/mail.module';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  imports: [MailModule],
  providers: [UsersService, NotificationsService],
  controllers: [UsersController],
})
export class UsersModule {}
