import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { PrismaModule } from './core/database/prisma.module';
import { SeederModule } from './core/seed/seeder.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { GroupsModule } from './modules/groups/groups.module';
import { GroupTeachersModule } from './modules/group-teachers/group-teachers.module';
import { GroupStudentsModule } from './modules/group-students/group-students.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { LessonVideosModule } from './modules/lesson-videos/lesson-videos.module';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { HomeworksModule } from './modules/homeworks/homeworks.module';
import { HomeworkAnswersModule } from './modules/homework-answers/homework-answers.module';
import { HomeworkResultsModule } from './modules/homework-results/homework-results.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAccessGuard } from './common/guards/jwt-access.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    SeederModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    RoomsModule,
    GroupsModule,
    GroupTeachersModule,
    GroupStudentsModule,
    LessonsModule,
    LessonVideosModule,
    AttendancesModule,
    HomeworksModule,
    HomeworkAnswersModule,
    HomeworkResultsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAccessGuard }],
})
export class AppModule {}
