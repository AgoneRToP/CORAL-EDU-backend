import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({
    example: 'Full-stack',
  })
  @IsString({ message: "Это поле должно быть строкой"})
  @IsNotEmpty({ message: "Это поле не может быть пустым"})
  name!: string;

  @ApiPropertyOptional({
    example: 'Node.js & Vue.js',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '1250000',
  })
  @IsNumber()
  @IsPositive({message:"Это поле должно быть положительным числом"})
  @Type(() => Number)
  price!: number;

  @ApiPropertyOptional({
    example: 3,
  })
  @IsInt({message:"Это поле должно быть целым числом"})
  @IsPositive({message:"Это поле должно быть положительным числом"})
  durationHours!: number;

  @ApiPropertyOptional({
    example: 8,
  })
  @IsInt({message:"Это поле должно быть целым числом"})  
  @IsPositive({message:"Это поле должно быть положительным числом"})
  durationMonths!: number;
}
