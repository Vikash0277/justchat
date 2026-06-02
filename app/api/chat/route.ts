import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromRequest } from '@/utils/auth';
import { getMessages, addMessage } from '@/utils/chatStore';

// GET /api/chat – return messages between current user and specified contact
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get('contactId');
  if (!contactId) {
    return NextResponse.json({ error: 'Missing contactId' }, { status: 400 });
  }
  const msgs = getMessages(user.sub, contactId);
  return NextResponse.json({ messages: msgs });
}

// POST /api/chat – add a new chat message for the current user to a contact
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { text, contactId } = await req.json();
  if (!text || typeof text !== 'string' || !contactId || typeof contactId !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid text/contactId' }, { status: 400 });
  }

  const msg = {
    id: uuidv4(),
    from: user.sub,
    text,
    ts: Date.now(),
  };

  addMessage(user.sub, contactId, msg);
  return NextResponse.json({ ok: true, message: msg });
}
