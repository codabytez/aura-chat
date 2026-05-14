import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  limit,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/firebase';
import { UserProfile } from '@/types/user';
import Avatar from '@/components/Avatar';
import EmptyState from '@/components/EmptyState';
import { useConversationsStore } from '@/stores/conversationsStore';
import { colors, font } from '@/theme';

export default function People() {
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  // Group creation state
  const [groupMode, setGroupMode] = useState(false);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [showGroupNameModal, setShowGroupNameModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const currentUid = auth.currentUser?.uid ?? '';
  const { conversations } = useConversationsStore();

  const existingChats = useMemo(() => {
    const map = new Map<string, string>();
    conversations.forEach((conv) => {
      if (conv.participants.length === 2) {
        const other = conv.participants.find((uid) => uid !== currentUid);
        if (other) map.set(other, conv.id);
      }
    });
    return map;
  }, [conversations, currentUid]);

  useEffect(() => {
    const load = async () => {
      setLoadingUsers(true);
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(50)));
        const users: UserProfile[] = [];
        snap.forEach((d) => {
          if (d.id !== currentUid) {
            users.push({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) });
          }
        });
        setAllUsers(users);
      } finally {
        setLoadingUsers(false);
      }
    };
    load();
  }, [currentUid]);

  const displayedUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const stripped = term.startsWith('@') ? term.slice(1) : term;
    if (!stripped) return allUsers;
    return allUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(stripped) ||
        u.email.toLowerCase().includes(stripped) ||
        (u.username ?? '').includes(stripped),
    );
  }, [allUsers, search]);

  const toggleSelect = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid],
    );
  };

  const exitGroupMode = () => {
    setGroupMode(false);
    setSelectedUids([]);
  };

  const startChat = async (other: UserProfile) => {
    const existingId = existingChats.get(other.uid);
    if (existingId) {
      router.push(`/chats/${existingId}`);
      return;
    }
    setCreating(other.uid);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const existingQ = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUid),
      );
      const snap = await getDocs(existingQ);
      const existing = snap.docs.find((d) => {
        const p = d.data().participants as string[];
        return p.includes(other.uid) && p.length === 2;
      });
      if (existing) {
        router.push(`/chats/${existing.id}`);
        return;
      }
      const currentProfile = await getDoc(doc(db, 'users', currentUid));
      const currentData = currentProfile.data() as UserProfile | undefined;
      const convRef = await addDoc(collection(db, 'conversations'), {
        type: 'direct',
        participants: [currentUid, other.uid],
        participantNames: {
          [currentUid]: currentData?.displayName ?? currentUser.email ?? '',
          [other.uid]: other.displayName,
        },
        participantEmails: {
          [currentUid]: currentUser.email ?? '',
          [other.uid]: other.email,
        },
        lastMessageAt: serverTimestamp(),
        typing: {},
      });
      router.push(`/chats/${convRef.id}`);
    } finally {
      setCreating(null);
    }
  };

  const createGroup = async () => {
    const name = groupName.trim();
    if (!name || selectedUids.length === 0) return;
    setCreatingGroup(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const currentProfile = await getDoc(doc(db, 'users', currentUid));
      const currentData = currentProfile.data() as UserProfile | undefined;

      const allParticipants = [currentUid, ...selectedUids];
      const participantNames: Record<string, string> = {
        [currentUid]: currentData?.displayName ?? currentUser.email ?? '',
      };
      const participantEmails: Record<string, string> = {
        [currentUid]: currentUser.email ?? '',
      };
      selectedUids.forEach((uid) => {
        const user = allUsers.find((u) => u.uid === uid);
        if (user) {
          participantNames[uid] = user.displayName;
          participantEmails[uid] = user.email;
        }
      });

      const convRef = await addDoc(collection(db, 'conversations'), {
        type: 'group',
        groupName: name,
        groupAdminUid: currentUid,
        participants: allParticipants,
        participantNames,
        participantEmails,
        lastMessageAt: serverTimestamp(),
        typing: {},
      });

      setShowGroupNameModal(false);
      setGroupName('');
      exitGroupMode();
      router.push(`/chats/${convRef.id}`);
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        {groupMode ? (
          <>
            <TouchableOpacity onPress={exitGroupMode} style={styles.headerIconBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedUids.length > 0 ? `${selectedUids.length} selected` : 'New Group'}
            </Text>
            {selectedUids.length > 0 && (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => setShowGroupNameModal(true)}
              >
                <Text style={styles.nextBtnText}>Next</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Text style={styles.headerTitle}>People</Text>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setGroupMode(true)}
            >
              <Ionicons name="people-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons
            name="search"
            size={16}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, @username or email..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {loadingUsers && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      <FlatList
        data={displayedUsers}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={
          !loadingUsers && displayedUsers.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={
          !loadingUsers ? (
            <EmptyState
              title={search ? 'No users found' : 'No other users yet'}
              subtitle={search ? 'Try a different name or email' : ''}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const hasChat = existingChats.has(item.uid);
          const isSelected = selectedUids.includes(item.uid);

          if (groupMode) {
            return (
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => toggleSelect(item.uid)}
                activeOpacity={0.7}
              >
                <Avatar name={item.displayName} size={46} online={item.isOnline} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.displayName}</Text>
                  <Text style={styles.userEmail}>
                    {item.username ? `@${item.username}` : item.email}
                  </Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => startChat(item)}
              disabled={!!creating}
              activeOpacity={0.7}
            >
              <Avatar name={item.displayName} size={46} online={item.isOnline} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.displayName}</Text>
                <Text style={styles.userEmail}>
                  {item.username ? `@${item.username}` : item.email}
                </Text>
              </View>
              {creating === item.uid ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View
                  style={[styles.actionBtn, hasChat ? styles.openBtn : styles.chatBtn]}
                >
                  <Text
                    style={[
                      styles.actionBtnText,
                      hasChat ? styles.openBtnText : styles.chatBtnText,
                    ]}
                  >
                    {hasChat ? 'Open' : 'Chat'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Group name modal */}
      <Modal
        visible={showGroupNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupNameModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Group name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter group name..."
              placeholderTextColor={colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
              maxLength={40}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowGroupNameModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCreate,
                  (!groupName.trim() || creatingGroup) && styles.modalCreateDisabled,
                ]}
                onPress={createGroup}
                disabled={!groupName.trim() || creatingGroup}
              >
                {creatingGroup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 26, fontFamily: font.bold, color: colors.text },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nextBtnText: { color: '#fff', fontFamily: font.semiBold, fontSize: 14 },
  searchRow: { paddingHorizontal: 16, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 14,
  },
  emptyContainer: { flex: 1 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 12,
  },
  userInfo: { flex: 1 },
  userName: {
    fontFamily: font.semiBold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  userEmail: { fontFamily: font.regular, fontSize: 13, color: colors.textSecondary },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  chatBtn: { backgroundColor: colors.primaryDim },
  openBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  actionBtnText: { fontFamily: font.semiBold, fontSize: 13 },
  chatBtnText: { color: colors.primary },
  openBtnText: { color: colors.textSecondary },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontFamily: font.bold, color: colors.text },
  modalInput: {
    backgroundColor: colors.elevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalCancelText: {
    color: colors.textSecondary,
    fontFamily: font.semiBold,
    fontSize: 14,
  },
  modalCreate: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  modalCreateDisabled: { opacity: 0.5 },
  modalCreateText: { color: '#fff', fontFamily: font.semiBold, fontSize: 14 },
});
