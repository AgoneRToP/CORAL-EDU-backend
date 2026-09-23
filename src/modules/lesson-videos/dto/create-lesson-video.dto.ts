import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateLessonVideoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  lessonId: number;
}
