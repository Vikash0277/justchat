export interface UserProfile {
  id?: string;
  username: string;
  email: string;
  gender?: string;
  age?: string;
  country?: string;
  state?: string;
  isGuest?: boolean;
}

export interface Message {
  id: string;
  sender: "me" | "them";
  text: string;
  timestamp: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  publicId?: string;
  ts?: number;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  status: "online" | "offline" | "typing...";
  avatarColor: string;
  gender: string;
  role: string;
  messages: Message[];
}

