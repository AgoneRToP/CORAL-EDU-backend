import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroupStatus, Week } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryGroupDto {
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

  @ApiPropertyOptional({ description: 'Поиск по названию группы' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: GroupStatus })
  @IsOptional()
  @IsEnum(GroupStatus)
  status?: GroupStatus;

  @ApiPropertyOptional({ enum: Week })
  @IsOptional()
  @IsEnum(Week)
  week?: Week;

  @ApiPropertyOptional({ description: 'Фильтр по ID курса' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  courseId?: number;

  @ApiPropertyOptional({ description: 'Фильтр по ID кабинета' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roomId?: number;
}
