import { View, Text, StyleSheet } from 'react-native';
import { MessageStatus } from '@/types/message';
import { colors } from '@/theme';

interface Props {
  status: MessageStatus;
}

export default function ReadReceipt({ status }: Props) {
  if (status === 'sending') {
    return <Text style={[styles.dot, { color: 'rgba(255,255,255,0.3)' }]}>○</Text>;
  }
  if (status === 'sent') {
    return <Text style={[styles.dot, { color: 'rgba(255,255,255,0.5)' }]}>●</Text>;
  }
  if (status === 'delivered') {
    return (
      <View style={styles.row}>
        <Text style={[styles.dot, { color: 'rgba(255,255,255,0.5)' }]}>●</Text>
        <Text style={[styles.dot, { color: 'rgba(255,255,255,0.5)' }]}>●</Text>
      </View>
    );
  }
  // seen — mint green dots
  return (
    <View style={styles.row}>
      <Text style={[styles.dot, { color: colors.seen }]}>●</Text>
      <Text style={[styles.dot, { color: colors.seen }]}>●</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
  dot: { fontSize: 8, lineHeight: 12 },
});
