import { router } from 'expo-router';
import SplashScreen from '@/components/SplashScreen';

export default function SplashRoute() {
  return <SplashScreen onDone={() => router.replace('/(tabs)')} />;
}
