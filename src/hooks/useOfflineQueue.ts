import { useEffect, useRef, useState } from 'react';
import * as Network from 'expo-network';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { MessageStatus } from '@/types/message';

interface QueuedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  text?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(true);
  const queue = useRef<QueuedMessage[]>([]);
  const flushing = useRef(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const check = async () => {
      const state = await Network.getNetworkStateAsync();
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (online && queue.current.length > 0 && !flushing.current) {
        flush();
      }
    };

    check();
    interval = setInterval(check, 4000);
    return () => clearInterval(interval);
  }, []);

  const flush = async () => {
    flushing.current = true;
    const pending = [...queue.current];
    queue.current = [];
    for (const msg of pending) {
      try {
        const ref = await addDoc(
          collection(db, 'conversations', msg.conversationId, 'messages'),
          {
            senderId: msg.senderId,
            type: msg.type,
            text: msg.text ?? null,
            mediaUrl: msg.mediaUrl ?? null,
            thumbnailUrl: msg.thumbnailUrl ?? null,
            duration: msg.duration ?? null,
            reactions: {},
            status: 'sent' as MessageStatus,
            readBy: [],
            deliveredTo: [],
            edited: false,
            deletedForEveryone: false,
            deletedFor: [],
            createdAt: serverTimestamp(),
          },
        );
        await updateDoc(doc(db, 'conversations', msg.conversationId), {
          lastMessage:
            msg.text ?? (msg.type === 'audio' ? '🎤 Voice message' : '📎 Media'),
          lastMessageAt: serverTimestamp(),
        });
        // clean up the placeholder
        try {
          await updateDoc(
            doc(db, 'conversations', msg.conversationId, 'messages', msg.id),
            { deletedForEveryone: true },
          );
        } catch {}
        console.log('[Queue] Flushed message', ref.id);
      } catch (e) {
        // put it back if it still fails
        queue.current.push(msg);
        console.warn('[Queue] Re-queued message', e);
      }
    }
    flushing.current = false;
  };

  const enqueue = (msg: QueuedMessage) => {
    queue.current.push(msg);
  };

  return { isOnline, enqueue };
}
