import { Module } from '@nestjs/common';
import { GroupStudentsController } from './group-students.controller';
import { GroupStudentsService } from './group-students.service';

@Module({
  controllers: [GroupStudentsController],
  providers: [GroupStudentsService],
  exports: [GroupStudentsService],
})
export class GroupStudentsModule {}
