import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateGroupTeacherDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  teacherId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  groupId: number;
}
