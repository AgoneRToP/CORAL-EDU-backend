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
  @IsInt({ message: 'Это поле должно быть целым числом' })
  @IsPositive({ message: 'Это поле должно быть положительным числом' })
  capacity?: number;
}
