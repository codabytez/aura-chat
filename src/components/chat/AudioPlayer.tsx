import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface Props {
  uri: string;
  duration?: number;
  mine: boolean;
}

export default function AudioPlayer({ uri, duration, mine }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [position, setPosition] = useState(0);
  const totalMs = (duration ?? 0) * 1000;

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const togglePlay = async () => {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { progressUpdateIntervalMillis: 200 },
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        setPosition(status.positionMillis);
        if (status.didJustFinish) {
          setPlaying(false);
          setPosition(0);
          soundRef.current?.setPositionAsync(0);
        }
      });
      await sound.setRateAsync(speed, true);
      await sound.playAsync();
      setPlaying(true);
      return;
    }
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setPlaying(true);
    }
  };

  const toggleSpeed = async () => {
    const next = speed === 1 ? 2 : 1;
    setSpeed(next);
    await soundRef.current?.setRateAsync(next, true);
  };

  const progress = totalMs > 0 ? position / totalMs : 0;
  const elapsed = Math.floor(position / 1000);
  const total = Math.floor(duration ?? 0);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const trackColor = mine ? 'rgba(255,255,255,0.3)' : '#ddd';
  const fillColor = mine ? '#fff' : '#222';
  const textColor = mine ? '#fff' : '#222';
  const iconColor = mine ? '#fff' : '#222';

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
        <Ionicons
          name={playing ? 'pause-circle' : 'play-circle'}
          size={32}
          color={iconColor}
        />
      </TouchableOpacity>
      <View style={styles.trackArea}>
        <View style={[styles.track, { backgroundColor: trackColor }]}>
          <View
            style={[
              styles.fill,
              { backgroundColor: fillColor, width: `${progress * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.time, { color: textColor }]}>
          {fmt(elapsed)} / {fmt(total)}
        </Text>
      </View>
      <TouchableOpacity onPress={toggleSpeed} style={styles.speedBtn}>
        <Text style={[styles.speedText, { color: textColor }]}>{speed}x</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 180 },
  playBtn: { width: 36, alignItems: 'center' },
  trackArea: { flex: 1, gap: 3 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  time: { fontSize: 10 },
  speedBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  speedText: { fontSize: 11, fontWeight: '600' },
});
