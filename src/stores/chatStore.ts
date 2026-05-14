import { create } from 'zustand';
import { Message } from '@/types/message';

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  searchOpen: boolean;
  searchIndex: number;
  pendingCount: number;

  setMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchIndex: (index: number) => void;
  incrementPending: () => void;
  decrementPending: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: true,
  error: null,
  searchQuery: '',
  searchOpen: false,
  searchIndex: 0,
  pendingCount: 0,

  setMessages: (messages) => set({ messages, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setSearchQuery: (searchQuery) => set({ searchQuery, searchIndex: 0 }),
  setSearchOpen: (searchOpen) => set({ searchOpen, searchQuery: '' }),
  setSearchIndex: (searchIndex) => set({ searchIndex }),
  incrementPending: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
  decrementPending: () => set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),
  reset: () =>
    set({
      messages: [],
      loading: true,
      error: null,
      searchQuery: '',
      searchOpen: false,
      searchIndex: 0,
      pendingCount: 0,
    }),
}));
