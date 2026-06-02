import { deleteMedia } from "./cloudinary";
import { chatMap, type ChatMessage } from "./chatStore";

export const notifyMessageUpdated = async (messageId: string, message: ChatMessage) => {
  try {
    await fetch("http://localhost:3001/api/message-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, message }),
    });
  } catch (err) {
    console.error("Failed to notify socket server of message update:", err);
  }
};

export const notifyMessageDeleted = async (messageId: string) => {
  try {
    await fetch("http://localhost:3001/api/message-deleted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
  } catch (err) {
    console.error("Failed to notify socket server of message deletion:", err);
  }
};

// Keep track of active timers so we don't duplicate or leak them
const activeCleanups = new Map<string, NodeJS.Timeout>();

export const scheduleMediaDeletion = (
  messageId: string,
  publicId: string,
  mediaType: "image" | "video",
  delayMs = 600000 // Default to 10 minutes (600,000 ms)
) => {
  // Cancel any existing timer for this message
  if (activeCleanups.has(messageId)) {
    clearTimeout(activeCleanups.get(messageId));
  }

  const timer = setTimeout(async () => {
    activeCleanups.delete(messageId);
    console.log(`Auto-deleting media: ${publicId} for message ${messageId}`);

    // 1. Delete from Cloudinary or local filesystem
    await deleteMedia(publicId, mediaType);

    // 2. Remove media from message in store
    let updatedMessage: ChatMessage | null = null;
    for (const [key, messages] of chatMap.entries()) {
      const msg = messages.find((m) => m.id === messageId);
      if (msg) {
        msg.mediaUrl = undefined;
        msg.mediaType = undefined;
        msg.publicId = undefined;
        msg.text = msg.text || "[Media expired and deleted]";
        updatedMessage = { ...msg };
        chatMap.set(key, messages);
        break;
      }
    }

    // 3. Notify socket server (and therefore both clients) in real-time
    if (updatedMessage) {
      await notifyMessageUpdated(messageId, updatedMessage);
    }
  }, delayMs);

  activeCleanups.set(messageId, timer);
};

export const cancelMediaDeletion = (messageId: string) => {
  if (activeCleanups.has(messageId)) {
    clearTimeout(activeCleanups.get(messageId));
    activeCleanups.delete(messageId);
  }
};

// Scan and initialize cleanup schedules on startup
export const initializeMediaCleaners = () => {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  let count = 0;

  for (const [key, messages] of chatMap.entries()) {
    for (const msg of messages) {
      if (msg.publicId && msg.mediaType) {
        const elapsed = now - msg.ts;
        if (elapsed >= TEN_MINUTES) {
          // Already expired, delete immediately
          console.log(`Startup cleanup: Media ${msg.publicId} has expired, deleting immediately.`);
          deleteMedia(msg.publicId, msg.mediaType).catch(console.error);
          msg.mediaUrl = undefined;
          msg.mediaType = undefined;
          msg.publicId = undefined;
          msg.text = msg.text || "[Media expired and deleted]";
          count++;
        } else {
          // Remaining time
          const remaining = TEN_MINUTES - elapsed;
          console.log(`Startup cleanup: Rescheduling media ${msg.publicId} for remaining ${remaining}ms.`);
          scheduleMediaDeletion(msg.id, msg.publicId, msg.mediaType, remaining);
          count++;
        }
      }
    }
  }

  if (count > 0) {
    console.log(`Initialized/processed ${count} media expiration cleanup tasks.`);
  }
};
