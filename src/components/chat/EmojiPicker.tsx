// eslint-disable-next-line import/no-named-as-default
import EmojiKeyboard, { type EmojiType } from 'rn-emoji-keyboard';
import { colors } from '@/theme';

interface Props {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ visible, onSelect, onClose }: Props) {
  const handleSelect = (emoji: EmojiType) => {
    onSelect(emoji.emoji);
    onClose();
  };

  return (
    <EmojiKeyboard
      open={visible}
      onClose={onClose}
      onEmojiSelected={handleSelect}
      theme={{
        backdrop: 'rgba(0,0,0,0.5)',
        knob: colors.primary,
        container: colors.elevated,
        header: colors.text,
        skinTonesContainer: colors.surface,
        category: {
          icon: colors.textSecondary,
          iconActive: colors.primary,
          container: colors.surface,
          containerActive: colors.primaryDim,
        },
        search: {
          background: colors.surface,
          placeholder: colors.textMuted,
          text: colors.text,
        },
        emoji: {
          selected: colors.primaryDim,
        },
      }}
      enableSearchBar
      enableRecentlyUsed
    />
  );
}
