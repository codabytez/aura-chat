import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '@/theme';

interface Props {
  visible: boolean;
}

export default function OfflineBanner({ visible }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
      <Text style={styles.text}>
        {"You're offline — messages will send when reconnected"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.textMuted,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  text: { color: '#fff', fontSize: 12, fontFamily: font.regular, flex: 1 },
});
