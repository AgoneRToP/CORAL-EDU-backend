import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAttendanceDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isPresent: boolean;
}
