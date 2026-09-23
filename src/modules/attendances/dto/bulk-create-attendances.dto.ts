import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  ValidateNested,
} from 'class-validator';

class StudentAttendanceEntry {
  @ApiProperty({ example: 5 })
  @IsInt()
  studentId: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isPresent: boolean;
}

export class BulkCreateAttendanceDto {
  @ApiProperty({
    example: 1,
  })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  lessonId: number;

  @ApiProperty({ type: [StudentAttendanceEntry] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceEntry)
  students: StudentAttendanceEntry[];
}
