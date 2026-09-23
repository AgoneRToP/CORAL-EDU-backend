import { ApiPropertyOptional } from '@nestjs/swagger';
import { HomeworkStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class QueryHomeworkResultDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Фильтр по ID домашнего задания' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  homeworkId?: number;

  @ApiPropertyOptional({ description: 'Фильтр по ID ответа студента' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  homeworkAnswerId?: number;

  @ApiPropertyOptional({ description: 'Фильтр по ID преподавателя' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Фильтр по ID группы (через homework → lesson)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @ApiPropertyOptional({ enum: HomeworkStatus })
  @IsOptional()
  @IsEnum(HomeworkStatus)
  homeworkStatus?: HomeworkStatus;
}
