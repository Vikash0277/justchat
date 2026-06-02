import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/utils/auth';

export async function POST(req: Request) {
  const { email, password, name } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, name },
  });
  const token = signToken({ sub: user.id, role: 'user' });
  const res = NextResponse.json({ id: user.id, name: user.name, email: user.email });
  res.cookies.set('auth', token, {
    httpOnly: true,
    path: '/',
    maxAge: 24 * 60 * 60,
    sameSite: 'lax',
  });
  return res;
}
