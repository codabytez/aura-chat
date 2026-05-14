import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/types/message';
import ReadReceipt from './ReadReceipt';
import { colors, font } from '@/theme';

function fmtTime(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let AudioPlayer: React.ComponentType<{
  uri: string;
  duration?: number;
  mine: boolean;
}> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AudioPlayer = require('./AudioPlayer').default;
} catch {
  // expo-av unavailable
}

interface Props {
  message: Message;
  mine: boolean;
  searchQuery: string;
  senderName?: string;
  onLongPress: () => void;
  onReactionPress: () => void;
}

function HighlightedText({
  text,
  query,
  style,
}: {
  text: string;
  query: string;
  style: object;
}) {
  if (!query) return <Text style={style}>{text}</Text>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {text.slice(0, idx)}
      <Text style={styles.highlight}>{text.slice(idx, idx + q.length)}</Text>
      {text.slice(idx + q.length)}
    </Text>
  );
}

export default function MessageBubble({
  message,
  mine,
  searchQuery,
  senderName,
  onLongPress,
  onReactionPress,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showAllReactions, setShowAllReactions] = useState(false);

  if (message.deletedForEveryone) {
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, styles.bubbleDeleted]}>
          <Text style={styles.deletedText}>This message was deleted</Text>
        </View>
      </View>
    );
  }

  const reactions = Object.entries(message.reactions ?? {}).filter(
    ([, users]) => users.length > 0,
  );

  const renderContent = () => {
    if (message.type === 'image' && message.mediaUrl) {
      return (
        <>
          <TouchableOpacity onPress={() => setFullscreen(true)}>
            <Image
              source={{ uri: message.mediaUrl }}
              style={styles.imageThumb}
              contentFit="cover"
            />
          </TouchableOpacity>
          {message.text ? (
            <HighlightedText
              text={message.text}
              query={searchQuery}
              style={mine ? styles.textMine : styles.textTheirs}
            />
          ) : null}
          <Modal
            visible={fullscreen}
            transparent
            animationType="fade"
            onRequestClose={() => setFullscreen(false)}
          >
            <Pressable
              style={styles.fullscreenOverlay}
              onPress={() => setFullscreen(false)}
            >
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.fullscreenImage}
                contentFit="contain"
              />
            </Pressable>
          </Modal>
        </>
      );
    }

    if (message.type === 'video' && message.thumbnailUrl) {
      return (
        <>
          <TouchableOpacity
            onPress={() => setFullscreen(true)}
            style={styles.videoThumbContainer}
          >
            <Image
              source={{ uri: message.thumbnailUrl }}
              style={styles.imageThumb}
              contentFit="cover"
            />
            <View style={styles.playOverlay}>
              <Ionicons name="play-circle" size={44} color="#fff" />
            </View>
          </TouchableOpacity>
          <Modal
            visible={fullscreen}
            transparent
            animationType="fade"
            onRequestClose={() => setFullscreen(false)}
          >
            <Pressable
              style={styles.fullscreenOverlay}
              onPress={() => setFullscreen(false)}
            >
              <Image
                source={{ uri: message.thumbnailUrl }}
                style={styles.fullscreenImage}
                contentFit="contain"
              />
              <Text style={styles.videoNote}>Video player coming soon</Text>
            </Pressable>
          </Modal>
        </>
      );
    }

    if (message.type === 'audio' && message.mediaUrl) {
      return AudioPlayer ? (
        <AudioPlayer uri={message.mediaUrl} duration={message.duration} mine={mine} />
      ) : (
        <View style={styles.audioFallback}>
          <Ionicons name="mic" size={16} color={mine ? '#fff' : '#555'} />
          <Text style={{ color: mine ? '#fff' : '#555', fontSize: 13 }}>
            Voice message
          </Text>
        </View>
      );
    }

    return (
      <HighlightedText
        text={message.text ?? ''}
        query={searchQuery}
        style={mine ? styles.textMine : styles.textTheirs}
      />
    );
  };

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <TouchableOpacity
        onLongPress={onLongPress}
        delayLongPress={300}
        activeOpacity={0.85}
        onPress={reactions.length > 0 ? onReactionPress : undefined}
      >
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {!mine && senderName && <Text style={styles.senderName}>{senderName}</Text>}
          {renderContent()}
          <View style={styles.metaRow}>
            {message.edited && (
              <Text
                style={[
                  styles.editedLabel,
                  mine ? styles.editedMine : styles.editedTheirs,
                ]}
              >
                Edited ·
              </Text>
            )}
            <Text
              style={[
                styles.timestamp,
                mine ? styles.timestampMine : styles.timestampTheirs,
              ]}
            >
              {fmtTime(message.createdAt as Parameters<typeof fmtTime>[0])}
            </Text>
            {mine && <ReadReceipt status={message.status} />}
          </View>
        </View>

        {reactions.length > 0 && (
          <View style={[styles.reactionsRow, mine ? styles.reactionsRowMine : null]}>
            {(showAllReactions ? reactions : reactions.slice(0, 3)).map(
              ([emoji, users]) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionChip}
                  onPress={onReactionPress}
                  activeOpacity={0.75}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {users.length > 1 && (
                    <Text style={styles.reactionCount}>{users.length}</Text>
                  )}
                </TouchableOpacity>
              ),
            )}

            {!showAllReactions && reactions.length > 3 && (
              <TouchableOpacity
                style={styles.overflowChip}
                onPress={() => setShowAllReactions(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.overflowText}>+{reactions.length - 3} more</Text>
              </TouchableOpacity>
            )}

            {showAllReactions && (
              <TouchableOpacity onPress={() => setShowAllReactions(false)}>
                <Text style={styles.lessLink}>less</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: 2, paddingHorizontal: 12 },
  rowMine: { alignItems: 'flex-end' },
  rowTheirs: { alignItems: 'flex-start' },
  bubble: { padding: 10, borderRadius: 16, maxWidth: '78%' },
  bubbleMine: { backgroundColor: colors.bubbleOut, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bubbleIn, borderBottomLeftRadius: 4 },
  bubbleDeleted: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deletedText: { color: colors.textMuted, fontStyle: 'italic', fontSize: 14 },
  textMine: { color: '#fff', fontSize: 15, lineHeight: 21 },
  textTheirs: { color: colors.text, fontSize: 15, lineHeight: 21 },
  highlight: { backgroundColor: colors.primary, color: '#fff' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 4,
  },
  timestamp: { fontSize: 11, fontFamily: font.regular },
  timestampMine: { color: 'rgba(255,255,255,0.55)' },
  timestampTheirs: { color: colors.textMuted },
  editedLabel: { fontSize: 11, fontFamily: font.regular },
  editedMine: { color: 'rgba(255,255,255,0.5)' },
  editedTheirs: { color: colors.textMuted },
  imageThumb: { width: 200, height: 200, borderRadius: 10, marginBottom: 4 },
  videoThumbContainer: { position: 'relative' },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
  },
  audioFallback: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: { width: '100%', height: '100%' },
  videoNote: { color: '#fff', position: 'absolute', bottom: 40 },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    maxWidth: '75%',
  },
  reactionsRowMine: { justifyContent: 'flex-end' },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  reactionEmoji: { fontSize: 15 },
  reactionCount: { fontSize: 11, color: colors.textSecondary, fontFamily: font.semiBold },
  overflowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  overflowText: { fontSize: 11, color: colors.textSecondary, fontFamily: font.semiBold },
  lessLink: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: font.semiBold,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  senderName: {
    fontSize: 12,
    fontFamily: font.semiBold,
    color: colors.primary,
    marginBottom: 3,
  },
});
