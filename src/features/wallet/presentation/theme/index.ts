import { useColorScheme } from 'react-native';
import {
  ThemeColors,
  lightColors,
  darkColors,
  CARD_PALETTES,
  CardColorPalette,
  getCardPalette,
} from './colors';
import { typography } from './typography';
import { spacing, borderRadius, elevation } from './spacing';

export interface WalletTheme {
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  elevation: typeof elevation;
  getCardPalette: (colorKey?: string | null) => CardColorPalette;
}

export function useWalletTheme(): WalletTheme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return {
    isDark,
    colors,
    typography,
    spacing,
    borderRadius,
    elevation,
    getCardPalette,
  };
}

export * from './colors';
export * from './typography';
export * from './spacing';

