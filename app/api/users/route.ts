import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getUserFromRequest } from '@/utils/auth';

export async function GET(req: Request) {
  const currentUser = await getUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  // Fetch all users from the database
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  // Return all other users as contacts (exclude the current user)
  const contacts = users.filter((u: any) => u.id !== currentUser.sub);

  return NextResponse.json({ users: contacts });
}
