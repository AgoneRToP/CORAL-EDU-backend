import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsNotIn,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role, Status } from '@prisma/client';

const userRoles = Object.values(Role).filter(
  (role) => role !== Role.SUPERADMIN,
);

export class QuaryUserDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Поиск пользователя' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: Status, example: Status.ACTIVE })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @ApiProperty({ enum: userRoles })
  @IsOptional()
  @IsEnum(userRoles)
  @IsNotIn([Role.SUPERADMIN])
  role?: Role;
}
