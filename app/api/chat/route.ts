import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getUserFromRequest } from "@/utils/auth";
import { PrismaClient } from "@prisma/client";
import { scheduleMediaDeletion, cancelMediaDeletion, notifyMessageDeleted } from "@/utils/mediaCleaner";
import { deleteMedia } from "@/utils/cloudinary";

const prisma = new PrismaClient();

// GET /api/chat – return paginated messages between current user and specified contact
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  if (!contactId) {
    return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
  }
  const skip = parseInt(searchParams.get("skip") ?? "0", 10);
  const take = parseInt(searchParams.get("take") ?? "20", 10);

  const whereClause = {
    OR: [
      { senderId: user.sub, receiverId: contactId },
      { senderId: contactId, receiverId: user.sub },
    ],
  };

  const [total, msgs] = await Promise.all([
    prisma.message.count({ where: whereClause }),
    prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      skip,
      take,
    }),
  ]);

  const hasMore = skip + take < total;
  return NextResponse.json({ messages: msgs, hasMore });
}

// POST /api/chat – add a new chat message for the current user to a contact
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { text, contactId, mediaUrl, mediaType, publicId } = await req.json();
  if (!contactId || typeof contactId !== "string") {
    return NextResponse.json({ error: "Missing or invalid contactId" }, { status: 400 });
  }

  const msg = await prisma.message.create({
    data: {
      id: uuidv4(),
      senderId: user.sub,
      receiverId: contactId,
      content: text ?? "",
      createdAt: new Date(),
      mediaUrl,
      mediaType,
      publicId,
    },
  });

  // If there's media (image/video), schedule its auto-deletion in 10 minutes
  if (publicId && mediaType) {
    scheduleMediaDeletion(msg.id, publicId, mediaType);
  }

  return NextResponse.json({ ok: true, message: msg });
}

// DELETE /api/chat – delete a chat message and any associated Cloudinary media
export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  if (!messageId) {
    return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
  }

  const deletedMsg = await prisma.message.delete({ where: { id: messageId } });
  if (deletedMsg) {
    // 1. Cancel the automatic cleanup timer if it is still active
    cancelMediaDeletion(messageId);

    // 2. If it contains media, destroy it from Cloudinary / local mock filesystem
    if (deletedMsg.publicId && deletedMsg.mediaType) {
      await deleteMedia(deletedMsg.publicId, deletedMsg.mediaType);
    }

    // 3. Notify socket server (and therefore both clients) in real-time
    await notifyMessageDeleted(messageId);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Message not found" }, { status: 404 });
}
