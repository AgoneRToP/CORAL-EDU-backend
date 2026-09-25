import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationEntity, NotificationAction } from '@prisma/client';

export class QueryNotificationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ enum: NotificationEntity })
  @IsOptional()
  @IsEnum(NotificationEntity)
  entity?: NotificationEntity;

  @ApiPropertyOptional({ enum: NotificationAction })
  @IsOptional()
  @IsEnum(NotificationAction)
  action?: NotificationAction;
}
