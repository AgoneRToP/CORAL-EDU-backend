import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsEnum,
  IsEmail,
  IsDate,
  MinLength,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { Role } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

const userRoles = Object.values(Role).filter(
  (role) => role !== Role.SUPERADMIN,
);

export class CreateUserDto {
  @ApiProperty({
    example: 'Vito',
  })
  @IsString()
  @IsNotEmpty({ message: 'Это поле не может быть пустым' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Scaletta',
  })
  @IsOptional()
  @IsString()
  surname?: string;

  @ApiProperty({ enum: userRoles })
  @IsEnum(userRoles)
  role: Role;

  @ApiPropertyOptional({
    example: 'test@gmail.com',
    description: 'Обязателен, если не указан phone',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((dto: CreateUserDto) => !dto.phone)
  @IsEmail({}, { message: 'Укажите email или телефон' })
  email?: string;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Обязателен, если не указан email',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @ValidateIf((dto: CreateUserDto) => !dto.email)
  @IsPhoneNumber('UZ', { message: 'Укажите email или телефон' })
  phone?: string;

  @ApiProperty({
    example: 'StrongPass123',
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(6, { message: 'Пароль должен содержать не менее 6 символов' })
  @IsNotEmpty({ message: 'Пароль не может быть пустым' })
  password!: string;

  @ApiPropertyOptional({
    example: '1925-05-02',
    type: String,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Некорректная дата рождения' })
  date?: Date;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({
    example: 'Sicily',
  })
  @IsOptional()
  @IsString()
  address?: string;
}
