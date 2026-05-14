import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';

async function setStatus(isOnline: boolean) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      isOnline,
      lastSeen: serverTimestamp(),
    });
  } catch {}
}

export function usePresence() {
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHeartbeat = () => {
    setStatus(true);
    if (heartbeat.current) clearInterval(heartbeat.current);
    heartbeat.current = setInterval(() => setStatus(true), 30_000);
  };

  const stopHeartbeat = () => {
    if (heartbeat.current) {
      clearInterval(heartbeat.current);
      heartbeat.current = null;
    }
    setStatus(false);
  };

  useEffect(() => {
    startHeartbeat();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    });

    return () => {
      stopHeartbeat();
      sub.remove();
    };
  }, []);
}
