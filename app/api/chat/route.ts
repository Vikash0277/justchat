import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getUserFromRequest } from "@/utils/auth";
import { getMessages, addMessage, deleteMessage } from "@/utils/chatStore";
import { scheduleMediaDeletion, cancelMediaDeletion, notifyMessageDeleted } from "@/utils/mediaCleaner";
import { deleteMedia } from "@/utils/cloudinary";

// GET /api/chat – return messages between current user and specified contact
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
  const msgs = getMessages(user.sub, contactId);
  return NextResponse.json({ messages: msgs });
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

  const msg = {
    id: uuidv4(),
    from: user.sub,
    text: text || "",
    ts: Date.now(),
    mediaUrl,
    mediaType,
    publicId,
  };

  addMessage(user.sub, contactId, msg);

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

  const deletedMsg = deleteMessage(messageId);
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
