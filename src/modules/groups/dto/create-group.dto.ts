import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Week } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';
 
export class CreateGroupDto {
  @ApiProperty({ example: 'JS-101' })
  @IsString({ message: "Название группы должно быть строкой"})
  @IsNotEmpty({ message: "Название группы не может быть пустым"})
  name!: string;
 
  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  startDate: string;
 
  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime должен быть в формате HH:mm',
  })
  startTime: string;
 
  @ApiProperty({ example: 15 })
  @IsInt({ message: "Максимальное количество студентов должно быть целым числом"})
  @IsPositive({ message: "Максимальное количество студентов должно быть положительным"})
  @Min(1)
  maxStudent: number;
 
  @ApiProperty({
    enum: Week,
    isArray: true,
    example: [Week.MONDAY, Week.WEDNESDAY],
  })
  @IsArray()
  @IsEnum(Week, { each: true })
  week: Week[];
 
  @ApiPropertyOptional({ example: 'Вечерняя группа для начинающих' })
  @IsOptional()
  @IsString()
  description?: string;
 
  @ApiProperty({ example: 1 })
  @IsInt()
  courseId: number;
 
  @ApiProperty({ example: 1 })
  @IsInt()
  roomId: number;
}
