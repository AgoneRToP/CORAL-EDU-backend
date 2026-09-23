import { ApiPropertyOptional } from '@nestjs/swagger';
import { HomeworkStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateHomeworkResultDto {
  @ApiPropertyOptional({ example: 'Проверено, отличная работа (обновлено)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  grade?: number;

  @ApiPropertyOptional({ enum: HomeworkStatus })
  @IsOptional()
  @IsEnum(HomeworkStatus)
  homeworkStatus?: HomeworkStatus;
}
