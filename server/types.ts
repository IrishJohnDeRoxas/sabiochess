import type { User } from './db/schema';
import type { JwtUserPayload } from './utils/jwt';

export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  JWT_SECRET?: string;
  POLAR_ACCESS_TOKEN?: string;
  POLAR_WEBHOOK_SECRET?: string;
}

export interface AppVariables {
  user?: User;
  jwtPayload?: JwtUserPayload;
  visitorId?: string;
}

export type UserTier = 'free' | 'pro' | 'lifetime';
