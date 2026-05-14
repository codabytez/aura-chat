import { Timestamp } from 'firebase/firestore';

export interface Conversation {
  id: string;
  type?: 'direct' | 'group';
  groupName?: string;
  groupAdminUid?: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantEmails: Record<string, string>;
  lastMessage?: string;
  lastMessageType?: string;
  lastMessageAt?: Timestamp;
  typing: Record<string, boolean>;
}
