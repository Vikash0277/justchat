import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PROD';

export type AuthPayload = {
  sub: string; // user id (guest or db id)
  role: 'guest' | 'user';
};

export const signToken = (payload: AuthPayload, expires = '24h') =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: expires as any });

export const verifyToken = (token: string): AuthPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
};

// Helper to extract JWT from request headers (used in API routes)
export const getUserFromRequest = async (req: Request): Promise<AuthPayload | null> => {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/auth=([^;]+)/);
  if (!match) return null;
  const token = match[1];
  return verifyToken(token);
};
