import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthUser } from '../types/express';
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
} from '../config/env';

// Sourced from the single validated config/env.ts, not read raw off
// process.env here — this used to read process.env.JWT_ACCESS_SECRET
// (a name that was never actually set anywhere; the real var is
// JWT_SECRET), so it silently signed every token with a hardcoded
// placeholder secret while auth.middleware.ts verified against the real
// one from config/env.ts. That mismatch was masked only by coincidence
// (both fallbacks happened to be the same literal string).
const ACCESS_SECRET = JWT_SECRET;
const REFRESH_SECRET = JWT_REFRESH_SECRET;

const ACCESS_TOKEN_TTL = JWT_EXPIRES_IN;
const REFRESH_TOKEN_TTL = JWT_REFRESH_EXPIRES_IN;

export interface TokenPayload extends AuthUser {
  type: 'access' | 'refresh';
}

export function signAccessToken(user: AuthUser): string {
  const payload: TokenPayload = { ...user, type: 'access' };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL } as SignOptions);
}

export function signRefreshToken(user: AuthUser): string {
  const payload: TokenPayload = { ...user, type: 'refresh' };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL } as SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export function issueTokenPair(user: AuthUser): TokenPair {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    expiresIn: ACCESS_TOKEN_TTL,
  };
}
