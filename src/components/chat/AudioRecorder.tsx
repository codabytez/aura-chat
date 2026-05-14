import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface Props {
  onRecorded: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export default function AudioRecorder({ onRecorded, onCancel }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startRecording();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!recording) return;
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const startRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      onCancel();
      return;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    setRecording(rec);
  };

  const stop = async (send: boolean) => {
    if (!recording) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (send && uri) {
      onRecorded(uri, seconds);
    } else {
      onCancel();
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Ionicons name="close" size={22} color="#888" />
      </TouchableOpacity>
      <Animated.View style={[styles.dot, { transform: [{ scale: pulse }] }]} />
      <Text style={styles.timer}>{fmt(seconds)}</Text>
      <TouchableOpacity onPress={() => stop(true)} style={styles.sendBtn}>
        <Ionicons name="send" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  cancelBtn: { padding: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e74c3c' },
  timer: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  sendBtn: {
    backgroundColor: '#222',
    padding: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
