import { Timestamp } from 'firebase/firestore';

export type MessageType = 'text' | 'image' | 'video' | 'audio';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';

export interface Message {
  id: string;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  reactions: Record<string, string[]>;
  status: MessageStatus;
  readBy: string[];
  deliveredTo: string[];
  edited: boolean;
  deletedForEveryone: boolean;
  deletedFor: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
