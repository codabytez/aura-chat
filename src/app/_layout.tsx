import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from 'sonner-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { colors } from '@/theme';
import { usePresence } from '@/hooks/usePresence';
import { useAuthStore } from '@/stores/authStore';
import { auth } from '@/firebase';

function PresenceManager() {
  usePresence();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  const { setUser, setReady } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, [setUser, setReady]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <PresenceManager />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="chats/[id]" />
        <Stack.Screen name="chats/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="splash" options={{ animation: 'fade' }} />
      </Stack>
      <Toaster />
    </GestureHandlerRootView>
  );
}
