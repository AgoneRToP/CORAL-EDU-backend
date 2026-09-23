import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({
    example: 'axewarred@gmail.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+998935076263',
  })
  @IsOptional()
  @IsPhoneNumber('UZ')
  phone?: string;

  @ApiProperty({
    example: 'UVJVGHV56f5*^&R%^JBKIH*',
  })
  @IsString()
  password!: string;
}
