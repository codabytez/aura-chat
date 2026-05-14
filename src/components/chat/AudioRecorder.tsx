import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  useAudioRecorderState,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';

interface Props {
  onRecorded: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export default function AudioRecorder({ onRecorded, onCancel }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 1000);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.isRecording) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isRecording]);

  const startRecording = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      onCancel();
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stop = async (send: boolean) => {
    await recorder.stop();
    if (send && recorder.uri) {
      onRecorded(recorder.uri, Math.round(state.durationMillis / 1000));
    } else {
      onCancel();
    }
  };

  const seconds = Math.round(state.durationMillis / 1000);
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
