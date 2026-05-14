export const colors = {
  primary: '#7C73FF',
  primaryLight: '#9B94FF',
  primaryDim: 'rgba(124,115,255,0.15)',

  bg: '#0D0D1A',
  surface: '#1A1A2E',
  elevated: '#252540',
  border: '#2A2A42',

  bubbleOut: '#6C63FF',
  bubbleIn: '#1E1E34',

  seen: '#4AFFA0',
  delivered: '#9090BB',
  sent: '#9090BB',

  text: '#EFEFFF',
  textSecondary: '#8888AA',
  textMuted: '#55556A',

  danger: '#FF4F6A',
  success: '#4AFFA0',
};

export const font = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Avatar palette — one color per letter bucket
const AVATAR_COLORS = [
  '#6C63FF',
  '#FF6584',
  '#43B89C',
  '#F7B731',
  '#E17055',
  '#0984E3',
  '#A29BFE',
  '#00CEC9',
];

export function avatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}
