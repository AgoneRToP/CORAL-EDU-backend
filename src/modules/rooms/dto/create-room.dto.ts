import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    example: 'Mojang',
  })
  @IsString({ message: 'Это поле должно быть строкой' })
  @IsNotEmpty({ message: 'Это поле не может быть пустым' })
  name!: string;

  @ApiPropertyOptional({
    example: 21,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;
}
