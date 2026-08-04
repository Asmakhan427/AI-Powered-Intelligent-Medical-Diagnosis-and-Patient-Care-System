import 'express';

export type UserRole = 'patient' | 'doctor' | 'guest';

export interface AuthUser {
  id: number | string;
  role: UserRole;
  email?: string;
  name?: string;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
