import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font } from '@/theme';
import { useLocalSearchParams, router } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { auth, db } from '@/firebase';
import { useChatStore } from '@/stores/chatStore';
import { Message, MessageStatus } from '@/types/message';
import { Conversation } from '@/types/conversation';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import EmojiPicker from '@/components/chat/EmojiPicker';
import MessageActions from '@/components/chat/MessageActions';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import EmptyState from '@/components/EmptyState';
import { compressImage, generateVideoThumbnail } from '@/lib/compression';
import { uploadMedia } from '@/lib/storage';
import OfflineBanner from '@/components/OfflineBanner';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import Avatar from '@/components/Avatar';

let AudioRecorder: React.ComponentType<{
  onRecorded: (uri: string, duration: number) => void;
  onCancel: () => void;
}> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AudioRecorder = require('@/components/chat/AudioRecorder').default;
} catch {
  // expo-av unavailable (Expo Go) — audio recording disabled
}

const TYPING_TIMEOUT_MS = 3000;

export default function ChatRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUid = auth.currentUser?.uid ?? '';
  const { isOnline, enqueue } = useOfflineQueue();

  const {
    messages,
    loading,
    error,
    searchQuery,
    searchOpen,
    searchIndex,
    setMessages,
    setError,
    setSearchQuery,
    setSearchOpen,
    setSearchIndex,
    reset,
  } = useChatStore();

  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [searching, setSearching] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActive = useRef(false);

  const isGroup = conversation?.type === 'group';

  useEffect(() => {
    reset();
    if (!id) return;

    const convUnsub = onSnapshot(doc(db, 'conversations', id), (snap) => {
      if (snap.exists())
        setConversation({ id: snap.id, ...(snap.data() as Omit<Conversation, 'id'>) });
    });

    const msgsUnsub = onSnapshot(
      query(collection(db, 'conversations', id, 'messages'), orderBy('createdAt', 'asc')),
      (snap) => {
        const msgs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Message, 'id'>),
        }));
        setMessages(msgs);
        markDeliveredAndRead(msgs);
      },
      (err) => setError(err.message),
    );

    return () => {
      convUnsub();
      msgsUnsub();
      stopTyping();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const markDeliveredAndRead = useCallback(
    async (msgs: Message[]) => {
      if (!id) return;
      const batch = writeBatch(db);
      let changed = false;
      msgs.forEach((m) => {
        if (m.senderId === currentUid) return;
        if (m.deletedForEveryone) return;
        const ref = doc(db, 'conversations', id, 'messages', m.id);
        if (!m.deliveredTo?.includes(currentUid)) {
          batch.update(ref, { deliveredTo: arrayUnion(currentUid) });
          changed = true;
        }
        if (!m.readBy?.includes(currentUid)) {
          batch.update(ref, {
            readBy: arrayUnion(currentUid),
            status: 'seen' as MessageStatus,
          });
          changed = true;
        }
      });
      if (changed) await batch.commit();
    },
    [id, currentUid],
  );

  const startTyping = async () => {
    if (!id || typingActive.current) return;
    typingActive.current = true;
    await updateDoc(doc(db, 'conversations', id), { [`typing.${currentUid}`]: true });
  };

  const stopTyping = async () => {
    if (!id || !typingActive.current) return;
    typingActive.current = false;
    try {
      await updateDoc(doc(db, 'conversations', id), { [`typing.${currentUid}`]: false });
    } catch {}
  };

  const onChangeText = (val: string) => {
    setText(val);
    startTyping();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_TIMEOUT_MS);
  };

  const send = async () => {
    if (!id || !text.trim()) return;
    const body = text.trim();
    setText('');
    stopTyping();

    if (!isOnline) {
      const tempId = `offline-${Date.now()}`;
      enqueue({
        id: tempId,
        conversationId: id,
        senderId: currentUid,
        type: 'text',
        text: body,
      });
      return;
    }

    const ref = await addDoc(collection(db, 'conversations', id, 'messages'), {
      senderId: currentUid,
      type: 'text',
      text: body,
      reactions: {},
      status: 'sent' as MessageStatus,
      readBy: [],
      deliveredTo: [],
      edited: false,
      deletedForEveryone: false,
      deletedFor: [],
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'conversations', id), {
      lastMessage: body,
      lastMessageType: 'text',
      lastMessageAt: serverTimestamp(),
    });
    updateDeliveredStatus(ref.id);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const updateDeliveredStatus = async (msgId: string) => {
    if (!id) return;
    const convSnap = await getDoc(doc(db, 'conversations', id));
    const participants: string[] = convSnap.data()?.participants ?? [];
    const others = participants.filter((p) => p !== currentUid);
    if (others.length > 0) {
      await updateDoc(doc(db, 'conversations', id, 'messages', msgId), {
        deliveredTo: arrayUnion(...others),
        status: 'delivered' as MessageStatus,
      });
    }
  };

  const saveEdit = async () => {
    if (!id || !editingId || !editText.trim()) return;
    await updateDoc(doc(db, 'conversations', id, 'messages', editingId), {
      text: editText.trim(),
      edited: true,
      updatedAt: serverTimestamp(),
    });
    setEditingId(null);
    setEditText('');
  };

  const deleteForMe = async (msgId: string) => {
    if (!id) return;
    await updateDoc(doc(db, 'conversations', id, 'messages', msgId), {
      deletedFor: arrayUnion(currentUid),
    });
  };

  const deleteForEveryone = async (msgId: string) => {
    if (!id) return;
    const msg = messages.find((m) => m.id === msgId);
    if (msg?.senderId !== currentUid) return;
    await updateDoc(doc(db, 'conversations', id, 'messages', msgId), {
      deletedForEveryone: true,
      text: '',
      mediaUrl: '',
    });
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!id) return;
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    const users = msg.reactions?.[emoji] ?? [];
    const ref = doc(db, 'conversations', id, 'messages', msgId);
    if (users.includes(currentUid)) {
      await updateDoc(ref, { [`reactions.${emoji}`]: arrayRemove(currentUid) });
    } else {
      await updateDoc(ref, { [`reactions.${emoji}`]: arrayUnion(currentUid) });
    }
    setShowEmojiFor(null);
  };

  const leaveGroup = () => {
    Alert.alert('Leave group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (!id || !conversation) return;
          const remaining = conversation.participants.filter((p) => p !== currentUid);
          const update: Record<string, unknown> = {
            participants: arrayRemove(currentUid),
            [`participantNames.${currentUid}`]: deleteField(),
            [`participantEmails.${currentUid}`]: deleteField(),
          };
          if (conversation.groupAdminUid === currentUid && remaining.length > 0) {
            update.groupAdminUid = remaining[0];
          }
          await updateDoc(doc(db, 'conversations', id), update);
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission required',
        'Allow access to your photo library in settings.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await sendMedia(asset.uri, asset.type === 'video' ? 'video' : 'image');
  };

  const sendMedia = async (uri: string, type: 'image' | 'video') => {
    if (!id) return;
    setSendingMedia(true);
    try {
      const msgRef = doc(collection(db, 'conversations', id, 'messages'));
      const msgId = msgRef.id;

      let mediaUrl = '';
      let thumbnailUrl: string | undefined;

      if (type === 'image') {
        const compressed = await compressImage(uri);
        mediaUrl = await uploadMedia(id, msgId, compressed.uri, 'images', 'jpg');
      } else {
        thumbnailUrl = await generateVideoThumbnail(uri);
        const thumbUrl = await uploadMedia(id, msgId, thumbnailUrl, 'thumbnails', 'jpg');
        mediaUrl = await uploadMedia(id, msgId, uri, 'videos', 'mp4');
        thumbnailUrl = thumbUrl;
      }

      await addDoc(collection(db, 'conversations', id, 'messages'), {
        senderId: currentUid,
        type,
        mediaUrl,
        thumbnailUrl: thumbnailUrl ?? null,
        reactions: {},
        status: 'sent' as MessageStatus,
        readBy: [],
        deliveredTo: [],
        edited: false,
        deletedForEveryone: false,
        deletedFor: [],
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'conversations', id), {
        lastMessage: type === 'image' ? '📷 Photo' : '🎥 Video',
        lastMessageType: type,
        lastMessageAt: serverTimestamp(),
      });

      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSendingMedia(false);
    }
  };

  const sendAudio = async (uri: string, duration: number) => {
    if (!id) return;
    setShowRecorder(false);
    setSendingMedia(true);
    try {
      const msgId = doc(collection(db, 'conversations', id, 'messages')).id;
      const mediaUrl = await uploadMedia(id, msgId, uri, 'audio', 'm4a');
      await addDoc(collection(db, 'conversations', id, 'messages'), {
        senderId: currentUid,
        type: 'audio',
        mediaUrl,
        duration,
        reactions: {},
        status: 'sent' as MessageStatus,
        readBy: [],
        deliveredTo: [],
        edited: false,
        deletedForEveryone: false,
        deletedFor: [],
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'conversations', id), {
        lastMessage: '🎤 Voice message',
        lastMessageType: 'audio',
        lastMessageAt: serverTimestamp(),
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSendingMedia(false);
    }
  };

  const isTyping = Object.entries(conversation?.typing ?? {}).some(
    ([uid, v]) => uid !== currentUid && v,
  );

  const visibleMessages = messages.filter((m) => {
    if (m.deletedFor?.includes(currentUid)) return false;
    return true;
  });

  const searchMatches = searchQuery
    ? visibleMessages
        .map((m, i) => ({ m, i }))
        .filter(
          ({ m }) =>
            m.type === 'text' &&
            m.text?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
    : [];

  // 1:1 presence
  const otherId = !isGroup
    ? (conversation?.participants.find((p) => p !== currentUid) ?? null)
    : null;
  const otherName = otherId ? (conversation?.participantNames?.[otherId] ?? '') : '';
  const [otherOnline, setOtherOnline] = useState<boolean | null>(null);
  const [otherLastSeen, setOtherLastSeen] = useState<Date | null>(null);

  useEffect(() => {
    if (!otherId) return;
    const unsub = onSnapshot(doc(db, 'users', otherId), (snap) => {
      if (snap.exists()) {
        setOtherOnline(snap.data().isOnline ?? false);
        setOtherLastSeen(snap.data().lastSeen?.toDate?.() ?? null);
      }
    });
    return unsub;
  }, [otherId]);

  // Header info
  const headerName = isGroup ? (conversation?.groupName ?? 'Group') : otherName;
  const headerAvatar = headerName;
  const memberCount = conversation?.participants.length ?? 0;

  const actionMsg = messages.find((m) => m.id === showActionsFor);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <OfflineBanner visible={!isOnline} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          {headerAvatar ? <Avatar name={headerAvatar} size={40} /> : null}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {headerName}
            </Text>
            {isGroup ? (
              <Text style={styles.statusOffline}>{memberCount} members</Text>
            ) : otherOnline === true ? (
              <Text style={styles.statusOnline}>● online</Text>
            ) : otherLastSeen ? (
              <Text style={styles.statusOffline}>
                last seen {formatLastSeen(otherLastSeen)}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => setSearchOpen(!searchOpen)}>
            <Ionicons name="search" size={22} color={colors.text} />
          </TouchableOpacity>
          {isGroup && (
            <TouchableOpacity onPress={leaveGroup} style={styles.leaveBtn}>
              <Ionicons name="exit-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>

        {/* In-chat Search */}
        {searchOpen && (
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={(q) => {
                setSearching(true);
                setSearchQuery(q);
                setTimeout(() => setSearching(false), 300);
              }}
              autoFocus
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.searchCount}>
                {searchMatches.length > 0
                  ? `${searchIndex + 1}/${searchMatches.length}`
                  : searchQuery
                    ? '0 results'
                    : ''}
              </Text>
            )}
            {searchMatches.length > 1 && (
              <>
                <TouchableOpacity
                  onPress={() => setSearchIndex(Math.max(0, searchIndex - 1))}
                >
                  <Ionicons name="chevron-up" size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setSearchIndex(Math.min(searchMatches.length - 1, searchIndex + 1))
                  }
                >
                  <Ionicons name="chevron-down" size={20} color={colors.text} />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => setSearchOpen(false)}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            visibleMessages.length === 0 && styles.listEmpty,
          ]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <EmptyState title="No messages yet" subtitle="Say hello!" />
          }
          ListFooterComponent={
            isTyping ? (
              <TypingIndicator
                name={
                  isGroup
                    ? (Object.entries(conversation?.typing ?? {}).find(
                        ([uid, v]) => uid !== currentUid && v,
                      )?.[0] ?? '')
                    : otherName
                }
              />
            ) : null
          }
          renderItem={({ item }) => {
            const isSearchMatch = searchMatches.some(({ m }) => m.id === item.id);
            const isCurrentSearchResult = searchMatches[searchIndex]?.m.id === item.id;
            const senderName =
              isGroup && item.senderId !== currentUid
                ? (conversation?.participantNames?.[item.senderId] ?? '')
                : undefined;
            return (
              <View style={isCurrentSearchResult ? styles.highlightedRow : undefined}>
                <MessageBubble
                  message={item}
                  mine={item.senderId === currentUid}
                  searchQuery={isSearchMatch ? searchQuery : ''}
                  senderName={senderName}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowActionsFor(item.id);
                  }}
                  onReactionPress={() => setShowEmojiFor(item.id)}
                />
              </View>
            );
          }}
        />

        {/* Composer */}
        {showRecorder && AudioRecorder ? (
          <AudioRecorder onRecorded={sendAudio} onCancel={() => setShowRecorder(false)} />
        ) : editingId ? (
          <View style={styles.editBar}>
            <Text style={styles.editLabel}>Editing message</Text>
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={editText}
                onChangeText={setEditText}
                autoFocus
                multiline
              />
              <TouchableOpacity style={styles.sendBtn} onPress={saveEdit}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={() => {
                  setEditingId(null);
                  setEditText('');
                }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.composer}>
            <TouchableOpacity
              onPress={pickMedia}
              disabled={sendingMedia}
              style={styles.mediaBtn}
            >
              {sendingMedia ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="attach" size={24} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Message..."
                placeholderTextColor={colors.textMuted}
                value={text}
                onChangeText={onChangeText}
                multiline
              />
              <TouchableOpacity style={styles.emojiBtn}>
                <Ionicons name="happy-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setShowRecorder(true)}
              style={styles.mediaBtn}
            >
              <Ionicons name="mic-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendBtn} onPress={send}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <EmojiPicker
          visible={!!showEmojiFor}
          onSelect={(emoji) => {
            if (showEmojiFor) toggleReaction(showEmojiFor, emoji);
          }}
          onClose={() => setShowEmojiFor(null)}
        />

        {actionMsg && (
          <MessageActions
            visible={!!showActionsFor}
            isMine={actionMsg.senderId === currentUid}
            isText={actionMsg.type === 'text'}
            onReact={() => setShowEmojiFor(actionMsg.id)}
            onEdit={() => {
              setEditingId(actionMsg.id);
              setEditText(actionMsg.text ?? '');
              setShowActionsFor(null);
            }}
            onDeleteForMe={() => deleteForMe(actionMsg.id)}
            onDeleteForEveryone={() => deleteForEveryone(actionMsg.id)}
            onClose={() => setShowActionsFor(null)}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatLastSeen(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 10,
    backgroundColor: colors.surface,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, justifyContent: 'center' },
  headerName: { fontSize: 16, fontFamily: font.semiBold, color: colors.text },
  statusOnline: {
    fontSize: 12,
    fontFamily: font.regular,
    color: colors.seen,
    marginTop: 1,
  },
  statusOffline: {
    fontSize: 12,
    fontFamily: font.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
  leaveBtn: { padding: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.elevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
    color: colors.text,
    fontFamily: font.regular,
  },
  searchCount: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: font.regular,
    minWidth: 50,
    textAlign: 'center',
  },
  list: { paddingVertical: 8, backgroundColor: colors.bg },
  listEmpty: { flex: 1 },
  highlightedRow: { backgroundColor: colors.primaryDim },
  editBar: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  editLabel: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: font.semiBold,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  composer: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
  },
  mediaBtn: { paddingBottom: 8 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: 6,
  },
  emojiBtn: { padding: 6 },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 15,
    color: colors.text,
    fontFamily: font.regular,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontFamily: font.semiBold },
  cancelEditBtn: { paddingBottom: 8, paddingHorizontal: 4 },
});
