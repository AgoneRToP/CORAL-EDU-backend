import {
  PartialType,
  OmitType,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['role'] as const),
) {
  @ApiPropertyOptional({
    example: false,
    description: 'Удалить текущее фото пользователя',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  removePhoto?: boolean;
}
