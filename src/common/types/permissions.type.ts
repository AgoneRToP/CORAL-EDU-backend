export enum ResourceCategory {
  DASHBOARD = 'dashboard',
  TEACHER = 'teacher',
  STUDENT = 'student',
  PAYMENT = 'payment',
  EXAM = 'exam',
  COURSE = 'course',
  HOMEWORK = 'homework',
  MATERIAL = 'material',
  CATEGORY = 'category',
  SECTION = 'section',
  ASSISTANT = 'assistant',
  LESSON = 'lesson',
  COURSE_ASSISTANT = 'course_assistant',
  EXAM_RESULT = 'exam_result',
  COURSE_COMMENT = 'course_comment',
  COMMENT = 'comment',
  NOTIFICATION = 'notification'
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  DOWNLOAD = 'download',
  VIEW_ARCHIVE = 'view_archive'
}

export interface IPermission {
  category: ResourceCategory;
  access: PermissionAction[];
}
