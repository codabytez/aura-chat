import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  AuthError,
  User,
} from 'firebase/auth';
import { doc, runTransaction } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { auth, db } from '@/firebase';
import { colors, font } from '@/theme';

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

function friendlyError(e: unknown): string {
  const code = (e as AuthError)?.code;
  return AUTH_ERRORS[code] ?? 'Something went wrong. Please try again.';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/splash');
    } catch (e: unknown) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async () => {
    if (!email || !password || !displayName || !username) {
      toast.error('Please fill in all fields.');
      return;
    }
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      toast.error(
        'Username must be 3–20 characters: letters, numbers, underscores only.',
      );
      return;
    }
    setLoading(true);
    let user: User | undefined;
    try {
      ({ user } = await createUserWithEmailAndPassword(auth, email, password));
      await updateProfile(user, { displayName });
      const createdUser = user;
      await runTransaction(db, async (tx) => {
        const usernameRef = doc(db, 'usernames', cleanUsername);
        const usernameSnap = await tx.get(usernameRef);
        if (usernameSnap.exists()) throw new Error('username-taken');
        tx.set(usernameRef, { uid: createdUser.uid });
        tx.set(doc(db, 'users', createdUser.uid), {
          uid: createdUser.uid,
          email: createdUser.email,
          displayName,
          username: cleanUsername,
          createdAt: new Date().toISOString(),
        });
      });
      router.replace('/splash');
    } catch (e: unknown) {
      if ((e as Error)?.message === 'username-taken') {
        toast.error('That username is already taken.');
        // Clean up the auth account so they can try again
        await user?.delete();
      } else {
        toast.error(friendlyError(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="chatbubbles" size={32} color="#fff" />
          </View>
          <Text style={styles.appName}>Aura Chat</Text>
          <Text style={styles.tagline}>Dark, premium, real-time messaging</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {isSignUp ? 'Create account' : 'Welcome back'}
          </Text>

          {isSignUp && (
            <>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Display name"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.atSign}>@</Text>
                <TextInput
                  style={styles.input}
                  placeholder="username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={(t) =>
                    setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                />
              </View>
            </>
          )}

          <View style={styles.inputWrap}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isSignUp ? onSignUp : onSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Create account' : 'Sign in'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsSignUp((v) => !v)}
            style={styles.switchWrap}
          >
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={styles.switchAction}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 36 },
  brand: { alignItems: 'center', gap: 10 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: 28, fontFamily: font.bold, color: colors.text },
  tagline: {
    fontSize: 14,
    fontFamily: font.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: { gap: 14 },
  formTitle: { fontSize: 20, fontFamily: font.bold, color: colors.text, marginBottom: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 15,
  },
  atSign: {
    fontSize: 16,
    fontFamily: font.semiBold,
    color: colors.textMuted,
    marginRight: 4,
  },
  eyeBtn: { padding: 4 },
  button: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontFamily: font.semiBold, fontSize: 16 },
  switchWrap: { alignItems: 'center', marginTop: 4 },
  switchText: { fontFamily: font.regular, fontSize: 14, color: colors.textSecondary },
  switchAction: { fontFamily: font.semiBold, color: colors.primary },
});
