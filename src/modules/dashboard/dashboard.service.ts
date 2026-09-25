import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { Week } from '@prisma/client';

const TZ = 'Asia/Tashkent';
const DAY = 86_400_000;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * DAY);
    const d60 = new Date(now.getTime() - 60 * DAY);
    const in14 = new Date(now.getTime() + 14 * DAY);
    const monthsStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // день недели и время считаем по Ташкенту, а не по часовому поясу сервера
    const today = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: TZ,
    })
      .format(now)
      .toUpperCase() as Week;
    const [h, m] = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: TZ,
    })
      .format(now)
      .split(':')
      .map(Number);
    const nowMin = h * 60 + m;

    const activeStatuses = ['ACTIVE', 'PLANNED'] as const;
    const studentsCount = {
      select: { groupStudents: { where: { status: 'ACTIVE' as const } } },
    };

    const [
      usersByRole,
      activeGroups,
      activeCourses,
      activeRooms,
      newStudents,
      prevStudents,
      recent,
      todayRaw,
      inactiveUsers,
      attTotal,
      attPresent,
      pendingHomework,
      studentDates,
      coursesRaw,
      noTeacher,
      openGroups,
      soonPlanned,
      emptyCourses,
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.group.count({ where: { status: 'ACTIVE' } }),
      this.prisma.course.count({ where: { status: 'ACTIVE' } }),
      this.prisma.room.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({
        where: { role: 'STUDENT', created_at: { gte: d30 } },
      }),
      this.prisma.user.count({
        where: { role: 'STUDENT', created_at: { gte: d60, lt: d30 } },
      }),
      this.prisma.notification.findMany({
        take: 6,
        orderBy: { created_at: 'desc' },
        include: { actor: { select: { name: true, surname: true } } },
      }),
      this.prisma.group.findMany({
        where: { status: 'ACTIVE', week: { has: today } },
        orderBy: { startTime: 'asc' },
        include: {
          course: { select: { name: true, durationHours: true } },
          room: { select: { id: true, name: true } },
          groupTeachers: {
            where: { status: 'ACTIVE' },
            include: { teacher: { select: { name: true, surname: true } } },
          },
          _count: studentsCount,
        },
      }),
      this.prisma.user.count({ where: { status: 'INACTIVE' } }),
      this.prisma.attendance.count({ where: { created_at: { gte: d30 } } }),
      this.prisma.attendance.count({
        where: { created_at: { gte: d30 }, isPresent: true },
      }),
      this.prisma.homeworkAnswer.count({
        where: { homeworkStatus: 'PENDING' },
      }),
      this.prisma.user.findMany({
        where: { role: 'STUDENT', created_at: { gte: monthsStart } },
        select: { created_at: true },
      }),
      this.prisma.course.findMany({
        select: { name: true, groups: { select: { _count: studentsCount } } },
      }),
      this.prisma.group.findMany({
        where: {
          status: { in: [...activeStatuses] },
          groupTeachers: { none: { status: 'ACTIVE' } },
        },
        select: { id: true, name: true },
      }),
      this.prisma.group.findMany({
        where: { status: { in: [...activeStatuses] } },
        select: {
          id: true,
          name: true,
          maxStudent: true,
          _count: studentsCount,
        },
      }),
      this.prisma.group.findMany({
        where: { status: 'PLANNED', startDate: { gte: now, lte: in14 } },
        select: { id: true, name: true, startDate: true },
      }),
      this.prisma.course.findMany({
        where: { status: 'ACTIVE', groups: { none: {} } },
        select: { id: true, name: true },
      }),
    ]);

    // ---- пользователи по ролям
    const roles = Object.fromEntries(
      usersByRole.map((r) => [r.role, r._count._all]),
    );
    const totalUsers = usersByRole.reduce((s, r) => s + r._count._all, 0);

    // ---- тренд набора
    const trend = prevStudents
      ? Math.round(((newStudents - prevStudents) / prevStudents) * 100)
      : null;

    // ---- расписание на сегодня
    const busyRooms = new Set<number>();
    const schedule = todayRaw.map((g) => {
      const [sh, sm] = g.startTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = startMin + g.course.durationHours * 60;
      const isNow = nowMin >= startMin && nowMin < endMin;
      if (isNow) busyRooms.add(g.room.id);
      return {
        id: g.id,
        name: g.name,
        course: g.course.name,
        room: g.room.name,
        startTime: g.startTime,
        endTime: `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`,
        teachers: g.groupTeachers
          .map((t) => `${t.teacher.surname ?? ''} ${t.teacher.name}`.trim())
          .join(', '),
        students: g._count.groupStudents,
        maxStudent: g.maxStudent,
        isNow,
      };
    });

    // ---- динамика набора за 7 месяцев
    const buckets = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        0,
      );
    }
    for (const u of studentDates) {
      const d = u.created_at;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
    }
    const enrollment = [...buckets].map(([month, count]) => ({ month, count }));

    // ---- топ курсов по числу активных студентов
    const byCourse = coursesRaw
      .map((c) => ({
        name: c.name,
        students: c.groups.reduce((s, g) => s + g._count.groupStudents, 0),
      }))
      .filter((c) => c.students > 0)
      .sort((a, b) => b.students - a.students);
    const totalStudentsInCourses = byCourse.reduce((s, c) => s + c.students, 0);
    const topCourses = byCourse.slice(0, 4).map((c) => ({
      name: c.name,
      students: c.students,
      percent: Math.round((c.students / totalStudentsInCourses) * 100),
    }));

    // ---- блок «Требуют внимания»
    const attention: {
      level: 'danger' | 'warning' | 'info';
      text: string;
      link: string;
    }[] = [];
    noTeacher.forEach((g) =>
      attention.push({
        level: 'danger',
        text: `У группы «${g.name}» нет преподавателя`,
        link: '/admin/groups',
      }),
    );
    openGroups
      .filter(
        (g) => g.maxStudent > 0 && g._count.groupStudents >= g.maxStudent * 0.9,
      )
      .forEach((g) =>
        attention.push({
          level: 'warning',
          text: `Группа «${g.name}» почти заполнена: ${g._count.groupStudents}/${g.maxStudent}`,
          link: '/admin/groups',
        }),
      );
    soonPlanned.forEach((g) =>
      attention.push({
        level: 'info',
        text: `Группа «${g.name}» стартует ${g.startDate.toLocaleDateString('ru-RU')}`,
        link: '/admin/groups',
      }),
    );
    emptyCourses.forEach((c) =>
      attention.push({
        level: 'info',
        text: `У курса «${c.name}» нет групп`,
        link: '/admin/courses',
      }),
    );

    return {
      success: true,
      data: {
        totalUsers,
        students: roles.STUDENT ?? 0,
        teachers: roles.TEACHER ?? 0,
        activeGroups,
        activeCourses,
        newStudents,
        trend,
        recent,
        schedule,
        enrollment,
        topCourses,
        attention: attention.slice(0, 8),
        inactiveUsers,
        pendingHomework,
        attendanceRate: attTotal
          ? Math.round((attPresent / attTotal) * 100)
          : null,
        rooms: { busy: busyRooms.size, total: activeRooms },
      },
    };
  }
}
