import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/utils/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/utils/auth';

export async function POST(req: Request) {
  let name = 'Guest';
  try {
    const body = await req.json();
    if (body && body.name) {
      name = body.name;
    }
  } catch (e) {
    // Ignore body parsing errors
  }

  const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${uuidv4().substring(0, 8)}@guest.justchat.com`;
  const hashedPassword = await bcrypt.hash(uuidv4(), 10);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const token = signToken({ sub: user.id, role: 'guest' }, '24h');

    const response = NextResponse.json({ id: user.id, name: user.name, email: user.email });
    response.cookies.set('auth', token, {
      httpOnly: true,
      path: '/',
      maxAge: 24 * 60 * 60, // 1 day
      sameSite: 'lax',
    });
    return response;
  } catch (error) {
    console.error('Failed to create guest user in DB:', error);
    return NextResponse.json({ error: 'Failed to initialize guest session' }, { status: 500 });
  }
}
