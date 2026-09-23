import { Module } from '@nestjs/common';
import { GroupTeachersController } from './group-teachers.controller';
import { GroupTeachersService } from './group-teachers.service';
 
@Module({
  controllers: [GroupTeachersController],
  providers: [GroupTeachersService],
  exports: [GroupTeachersService],
})
export class GroupTeachersModule {}
 