import { Module } from '@nestjs/common';
import { HomeworkAnswersController } from './homework-answers.controller';
import { HomeworkAnswersService } from './homework-answers.service';

@Module({
  controllers: [HomeworkAnswersController],
  providers: [HomeworkAnswersService],
  exports: [HomeworkAnswersService],
})
export class HomeworkAnswersModule {}
