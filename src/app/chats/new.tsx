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
import { colors, font } from '@/theme';

export default function NewChat() {
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const currentUid = auth.currentUser?.uid ?? '';

  useEffect(() => {
    const load = async () => {
      setLoadingUsers(true);
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(50)));
        const users: UserProfile[] = [];
        snap.forEach((d) => {
          if (d.id !== currentUid)
            users.push({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) });
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

  const startChat = async (other: UserProfile) => {
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>New chat</Text>
        <View style={{ width: 38 }} />
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
            autoFocus
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
              title="No users found"
              subtitle="Try a different name, @username or email"
            />
          ) : null
        }
        renderItem={({ item }) => (
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
              <View style={styles.chatBtn}>
                <Text style={styles.chatBtnText}>Chat</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontFamily: font.bold, color: colors.text },
  searchRow: { padding: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: colors.text, fontFamily: font.regular, fontSize: 14 },
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
  chatBtn: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chatBtnText: { color: colors.primary, fontFamily: font.semiBold, fontSize: 13 },
});
