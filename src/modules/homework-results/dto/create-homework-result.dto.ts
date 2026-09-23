import { ApiProperty } from '@nestjs/swagger';
import { HomeworkStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateHomeworkResultDto {
  @ApiProperty({ example: 'Проверено, отличная работа' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 85, description: 'Оценка от 0 до 100' })
  @IsInt()
  @Min(0)
  @Max(100)
  grade: number;

  @ApiProperty({ enum: HomeworkStatus, example: HomeworkStatus.CHECKED })
  @IsEnum(HomeworkStatus)
  homeworkStatus: HomeworkStatus;

  @ApiProperty({
    example: 1,
    description: 'ID преподавателя, выставившего оценку',
  })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 7, description: 'ID проверяемого ответа студента' })
  @IsInt()
  homeworkAnswerId: number;
}
