import { Platform } from 'react-native';

export const colors = {
  primary: '#176235',
  primaryDark: '#0E4525',
  primarySoft: '#DDEDDD',
  mint: '#9FCB96',
  background: '#F5F8F3',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF3EC',
  text: '#17251C',
  textMuted: '#637068',
  border: '#D9E2D8',
  white: '#FFFFFF',
  danger: '#B42318',
  warning: '#B15C00',
  info: '#1F5B8C',
  green: '#2D7A45',
  yellow: '#D69E00',
  red: '#C43D32',
  black: '#242824',
};

export const shadows = Platform.select({
  web: { boxShadow: '0 10px 30px rgba(14, 69, 37, 0.08)' } as const,
  default: {
    shadowColor: '#0E4525',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
});

export const layout = {
  maxWidth: 1280,
  contentWidth: 920,
  radius: 16,
  radiusSmall: 10,
};
