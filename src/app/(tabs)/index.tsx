import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/firebase';
import { useConversationsStore } from '@/stores/conversationsStore';
import { useAuthStore } from '@/stores/authStore';
import { Conversation } from '@/types/conversation';
import Avatar from '@/components/Avatar';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import EmptyState from '@/components/EmptyState';
import { colors, font } from '@/theme';

function formatTime(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts?.toDate) return '';
  const date = ts.toDate();
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatsList() {
  const { conversations, loading, error, setConversations, setLoading, setError } =
    useConversationsStore();
  const { user } = useAuthStore();
  const uid = user?.uid ?? auth.currentUser?.uid ?? '';

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setConversations(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) })),
        );
      },
      (err) => setError(err.message),
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const getConvName = (conv: Conversation) => {
    if (conv.type === 'group') return conv.groupName ?? 'Group';
    const otherId = conv.participants.find((p) => p !== uid);
    return otherId
      ? (conv.participantNames?.[otherId] ??
          conv.participantEmails?.[otherId] ??
          'Unknown')
      : 'Unknown';
  };

  const lastMessagePreview = (conv: Conversation) => {
    if (!conv.lastMessage) return '';
    if (conv.lastMessageType === 'audio') return '🎤 Voice message';
    if (conv.lastMessageType === 'image') return '📷 Photo';
    if (conv.lastMessageType === 'video') return '🎥 Video';
    return conv.lastMessage;
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aura Chat</Text>
        <TouchableOpacity onPress={() => router.push('/chats/new')} style={styles.newBtn}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          conversations.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={
          <EmptyState
            title="No conversations yet"
            subtitle="Tap the edit icon to start a chat"
          />
        }
        renderItem={({ item }) => {
          const otherName = getConvName(item);
          const isTyping = Object.entries(item.typing ?? {}).some(
            ([id, v]) => id !== uid && v,
          );
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/chats/${item.id}`)}
              activeOpacity={0.7}
            >
              <Avatar name={otherName} size={50} />
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {otherName}
                  </Text>
                  <Text style={styles.time}>
                    {formatTime(item.lastMessageAt as Parameters<typeof formatTime>[0])}
                  </Text>
                </View>
                <Text style={styles.lastMsg} numberOfLines={1}>
                  {isTyping ? (
                    <Text style={styles.typingText}>typing...</Text>
                  ) : (
                    lastMessagePreview(item)
                  )}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 26, fontFamily: font.bold, color: colors.text },
  newBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: {
    fontFamily: font.semiBold,
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  time: { fontFamily: font.regular, fontSize: 12, color: colors.textMuted },
  lastMsg: { fontFamily: font.regular, fontSize: 13, color: colors.textSecondary },
  typingText: { color: colors.primary, fontFamily: font.semiBold },
});
