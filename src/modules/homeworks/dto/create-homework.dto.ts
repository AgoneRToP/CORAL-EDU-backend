import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';
 
export class CreateHomeworkDto {
  @ApiProperty({ example: 'Решить задачи 1-10 из главы про циклы' })
  @IsString()
  @IsNotEmpty()
  title: string;
 
  @ApiProperty({ example: 1, description: 'ID преподавателя (User с ролью TEACHER)' })
  @IsInt()
  userId: number;
 
  @ApiProperty({ example: 12, description: 'ID урока, к которому относится домашка' })
  @IsInt()
  lessonId: number;
}
 