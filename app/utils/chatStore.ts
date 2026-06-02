export type ChatMessage = {
  id: string;
  from: string;
  text: string;
  ts: number;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  publicId?: string;
};

// Simple per‑process store. Works for dev; replace with Redis in prod.
export const chatMap = new Map<string, ChatMessage[]>();

const getKey = (id1: string, id2: string) => {
  return [id1, id2].sort().join("_");
};

export const addMessage = (userId: string, contactId: string, msg: ChatMessage) => {
  const key = getKey(userId, contactId);
  const arr = chatMap.get(key) ?? [];
  arr.push(msg);
  chatMap.set(key, arr);
};

export const getMessages = (userId: string, contactId: string): ChatMessage[] => {
  const key = getKey(userId, contactId);
  return chatMap.get(key) ?? [];
};

export const clearMessages = (userId: string) => {
  for (const key of chatMap.keys()) {
    if (key.includes(userId)) {
      chatMap.delete(key);
    }
  }
};

export const deleteMessage = (messageId: string): ChatMessage | null => {
  for (const [key, messages] of chatMap.entries()) {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      const [deleted] = messages.splice(index, 1);
      chatMap.set(key, messages);
      return deleted;
    }
  }
  return null;
};
