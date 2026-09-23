import { Module } from '@nestjs/common';
import { LessonVideosController } from './lesson-videos.controller';
import { LessonVideosService } from './lesson-videos.service';

@Module({
  controllers: [LessonVideosController],
  providers: [LessonVideosService],
  exports: [LessonVideosService],
})
export class LessonVideosModule {}