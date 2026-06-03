import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Username query param required' }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({
    where: { name: username.toLowerCase() },
  });
  return NextResponse.json({ available: !existing });
}
