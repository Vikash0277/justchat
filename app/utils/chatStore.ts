type ChatMessage = {
  id: string;
  from: string;
  text: string;
  ts: number;
};

// Simple per‑process store. Works for dev; replace with Redis in prod.
const chatMap = new Map<string, ChatMessage[]>();

export const addMessage = (userId: string, contactId: string, msg: ChatMessage) => {
  const key = `${userId}_${contactId}`;
  const arr = chatMap.get(key) ?? [];
  arr.push(msg);
  chatMap.set(key, arr);
};

export const getMessages = (userId: string, contactId: string): ChatMessage[] => {
  const key = `${userId}_${contactId}`;
  return chatMap.get(key) ?? [];
};

export const clearMessages = (userId: string) => {
  for (const key of chatMap.keys()) {
    if (key.startsWith(`${userId}_`)) {
      chatMap.delete(key);
    }
  }
};
