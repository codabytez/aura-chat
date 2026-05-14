import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '@/theme';

interface Props {
  visible: boolean;
  isMine: boolean;
  isText: boolean;
  onReact: () => void;
  onEdit: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onClose: () => void;
}

export default function MessageActions({
  visible,
  isMine,
  isText,
  onReact,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onClose,
}: Props) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onClose();
              // small delay so sheet closes before emoji picker opens
              setTimeout(onReact, 150);
            }}
          >
            <Ionicons
              name="happy-outline"
              size={20}
              color={colors.primary}
              style={styles.icon}
            />
            <Text style={[styles.itemText, { color: colors.primary }]}>
              React with emoji
            </Text>
          </TouchableOpacity>

          {isMine && isText && (
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                onEdit();
                onClose();
              }}
            >
              <Ionicons
                name="pencil-outline"
                size={20}
                color={colors.text}
                style={styles.icon}
              />
              <Text style={styles.itemText}>Edit message</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onDeleteForMe();
              onClose();
            }}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={colors.text}
              style={styles.icon}
            />
            <Text style={styles.itemText}>Delete for me</Text>
          </TouchableOpacity>

          {isMine && (
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                onDeleteForEveryone();
                onClose();
              }}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={colors.danger}
                style={styles.icon}
              />
              <Text style={[styles.itemText, styles.danger]}>Delete for everyone</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.item, styles.cancel]} onPress={onClose}>
            <Text style={[styles.itemText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  icon: { marginRight: 14 },
  itemText: { fontSize: 16, fontFamily: font.regular, color: colors.text },
  danger: { color: colors.danger },
  cancel: { borderBottomWidth: 0 },
});
