import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

interface Props {
  uri: string;
  duration?: number;
  mine: boolean;
}

export default function AudioPlayer({ uri, duration, mine }: Props) {
  const [speed, setSpeed] = useState(1);
  const player = useAudioPlayer(uri, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const togglePlay = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const toggleSpeed = () => {
    const next = speed === 1 ? 2 : 1;
    setSpeed(next);
    player.playbackRate = next;
  };

  const position = status.currentTime;
  const total = duration ?? 0;
  const progress = total > 0 ? position / total : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

  const trackColor = mine ? 'rgba(255,255,255,0.3)' : '#ddd';
  const fillColor = mine ? '#fff' : '#222';
  const textColor = mine ? '#fff' : '#222';
  const iconColor = mine ? '#fff' : '#222';

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
        <Ionicons
          name={status.playing ? 'pause-circle' : 'play-circle'}
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
          {fmt(position)} / {fmt(total)}
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
