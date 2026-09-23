import { Role } from '@prisma/client';

export interface CurrentUserPayload {
  id: number;
  role: Role;
}
