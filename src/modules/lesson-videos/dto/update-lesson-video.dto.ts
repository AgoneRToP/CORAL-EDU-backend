import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateLessonVideoDto {
  @ApiPropertyOptional({ example: 'lesson-12-conditionals-v2.mp4' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  originalName?: string;
}
