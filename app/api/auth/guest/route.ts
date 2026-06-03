import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import prisma from '@/utils/prisma';
import { signToken } from '@/utils/auth';

export async function POST(req: Request) {
  let name = '';
  let age: number | null = null;
  let gender = '';
  let state = '';
  let country = '';

  try {
    const body = await req.json();
    if (body) {
      if (body.name) name = body.name;
      if (body.age !== undefined) age = Number(body.age);
      if (body.gender) gender = body.gender;
      if (body.state) state = body.state;
      if (body.country) country = body.country;
    }
  } catch (e) {
    // Ignore body parsing errors
  }

  const email = `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'guest'}-${uuidv4().substring(0, 8)}@guest.justchat.com`;
  const hashedPassword = await bcrypt.hash(uuidv4(), 10);

  try {
    const user = await prisma.user.create({
      data: {
        name: name || 'Guest',
        email,
        password: hashedPassword,
        role: 'guest',
        guestExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        age,
        gender,
        state,
        country,
      },
    });
    const token = signToken({ sub: user.id, role: 'guest' }, '24h');
    const response = NextResponse.json({ id: user.id, name: user.name, email: user.email });
    response.cookies.set('auth', token, { httpOnly: true, path: '/', maxAge: 24 * 60 * 60, sameSite: 'lax' });
    console.log('Guest user created:', { id: user.id, email: user.email });
    return response;
  } catch (error) {
    console.error('Failed to create guest user in DB:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize guest session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
