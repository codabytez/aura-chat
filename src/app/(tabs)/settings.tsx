import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/firebase';
import { useAuthStore } from '@/stores/authStore';
import { UserProfile } from '@/types/user';
import Avatar from '@/components/Avatar';
import { colors, font } from '@/theme';

export default function Settings() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists())
        setProfile({ uid: snap.id, ...(snap.data() as Omit<UserProfile, 'uid'>) });
    });
  }, [user?.uid]);

  const displayName = profile?.displayName ?? user?.displayName ?? user?.email ?? '';
  const avatarName = displayName || '?';

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.profile}>
        <Avatar name={avatarName} size={72} />
        <Text style={styles.profileName}>{displayName}</Text>
        {profile?.username && (
          <Text style={styles.profileUsername}>@{profile.username}</Text>
        )}
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={handleSignOut}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,79,106,0.12)' }]}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          </View>
          <Text style={[styles.rowText, { color: colors.danger }]}>Sign out</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 26, fontFamily: font.bold, color: colors.text },
  profile: { alignItems: 'center', paddingVertical: 28, gap: 4 },
  profileName: { fontSize: 20, fontFamily: font.bold, color: colors.text, marginTop: 8 },
  profileUsername: { fontSize: 14, fontFamily: font.regular, color: colors.primary },
  profileEmail: { fontSize: 14, fontFamily: font.regular, color: colors.textSecondary },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, fontFamily: font.semiBold, fontSize: 15, color: colors.text },
});
