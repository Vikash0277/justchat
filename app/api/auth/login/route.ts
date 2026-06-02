import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/utils/auth';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

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
