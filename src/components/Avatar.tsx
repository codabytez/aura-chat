import { View, Text, StyleSheet } from 'react-native';
import { avatarColor, font } from '@/theme';

interface Props {
  name: string;
  size?: number;
  online?: boolean;
}

export default function Avatar({ name, size = 44, online }: Props) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const dotSize = Math.round(size * 0.28);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: avatarColor(name),
          },
        ]}
      >
        <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials}</Text>
      </View>
      {online && (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontFamily: font.bold, lineHeight: undefined },
  dot: {
    position: 'absolute',
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#0f0f1a',
  },
});
