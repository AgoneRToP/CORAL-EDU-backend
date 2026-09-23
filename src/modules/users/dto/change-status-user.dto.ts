import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotIn } from 'class-validator';
import { Role, Status } from '@prisma/client';

const userRoles = Object.values(Role).filter(
  (role) => role !== Role.SUPERADMIN,
);

export class ChangeStatusUserDto {
  @ApiProperty({ required: false, enum: Status, example: Status.ACTIVE })
  @IsEnum(Status)
  status: Status;

  @ApiProperty({ enum: userRoles, required: false })
  @IsEnum(userRoles)
  @IsNotIn([Role.SUPERADMIN])
  role: Role;
}
