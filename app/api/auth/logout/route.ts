import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/utils/auth';
import { clearMessages } from '@/utils/chatStore';

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (user) {
    clearMessages(user.sub);
  }
  const res = NextResponse.json({ ok: true });
  // Remove auth cookie
  res.cookies.delete('auth');
  return res;
}
