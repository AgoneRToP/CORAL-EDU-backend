import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({ example: 'Условные операторы в JS' })
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiPropertyOptional({
    example: 'Разбор if/else, switch, тернарного оператора',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  groupId: number;
}
