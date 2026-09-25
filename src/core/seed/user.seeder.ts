import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role, Status } from '@prisma/client';
import * as argon from 'argon2';

@Injectable()
export class UserSeeder implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const existUser = await this.prisma.user.findFirst({
      where: {
        phone: process.env.ADMIN_PHONE as string,
      },
    });

    if (existUser) {
      Logger.log('✅ Super Admin already exists');
    } else {
      await this.prisma.user.create({
        data: {
          name: 'SUPERADMIN',
          phone: process.env.ADMIN_PHONE as string,
          email: process.env.ADMIN_EMAIL as string,
          password: await argon.hash(process.env.ADMIN_PASSWORD as string),
          role: Role.SUPERADMIN,
          status: Status.ACTIVE,
          photo: "SUPERADMIN.png"
        },
      });

      Logger.log('✅ Super Admin Created');
    }
  }
}
