import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHomeworkAnswerDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  homeworkId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  studentId: number;

  @ApiPropertyOptional({ example: 'Моё решение' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;
}
