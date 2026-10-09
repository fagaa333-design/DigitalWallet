export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentMuted: string;
  accentContrast: string;
  success: string;
  warning: string;
  danger: string;
  cardPlaceholder: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  background: '#F6F8FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F0F3F6',
  border: '#E2E8F0',
  borderSubtle: '#EDF2F7',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  accent: '#2563EB',
  accentMuted: '#DBEAFE',
  accentContrast: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  cardPlaceholder: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#0B0F19',
  surface: '#121826',
  surfaceElevated: '#1A2234',
  surfaceSubtle: '#182133',
  border: '#26334D',
  borderSubtle: '#1E293B',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  accent: '#3B82F6',
  accentMuted: '#1E3A8A',
  accentContrast: '#FFFFFF',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  cardPlaceholder: '#1E293B',
  overlay: 'rgba(0, 0, 0, 0.70)',
};

export interface CardColorPalette {
  id: string;
  name: string;
  background: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
}

export const CARD_PALETTES: Record<string, CardColorPalette> = {
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Black',
    background: '#111318',
    border: '#2A2F3D',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    badgeText: '#E5E7EB',
    accent: '#60A5FA',
  },
  sapphire: {
    id: 'sapphire',
    name: 'Royal Sapphire',
    background: '#1E3A8A',
    border: '#2563EB',
    textPrimary: '#FFFFFF',
    textSecondary: '#BFDBFE',
    badgeBg: 'rgba(255, 255, 255, 0.16)',
    badgeText: '#FFFFFF',
    accent: '#93C5FD',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest',
    background: '#064E3B',
    border: '#059669',
    textPrimary: '#FFFFFF',
    textSecondary: '#A7F3D0',
    badgeBg: 'rgba(255, 255, 255, 0.16)',
    badgeText: '#FFFFFF',
    accent: '#6EE7B7',
  },
  amethyst: {
    id: 'amethyst',
    name: 'Deep Amethyst',
    background: '#4C1D95',
    border: '#7C3AED',
    textPrimary: '#FFFFFF',
    textSecondary: '#DDD6FE',
    badgeBg: 'rgba(255, 255, 255, 0.16)',
    badgeText: '#FFFFFF',
    accent: '#C4B5FD',
  },
  copper: {
    id: 'copper',
    name: 'Burnt Copper',
    background: '#7C2D12',
    border: '#EA580C',
    textPrimary: '#FFFFFF',
    textSecondary: '#FED7AA',
    badgeBg: 'rgba(255, 255, 255, 0.16)',
    badgeText: '#FFFFFF',
    accent: '#FDBA74',
  },
  slate: {
    id: 'slate',
    name: 'Titanium Slate',
    background: '#334155',
    border: '#475569',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
    badgeBg: 'rgba(255, 255, 255, 0.14)',
    badgeText: '#F1F5F9',
    accent: '#94A3B8',
  },
};

export function getCardPalette(colorKey?: string | null): CardColorPalette {
  if (colorKey && CARD_PALETTES[colorKey]) {
    return CARD_PALETTES[colorKey];
  }
  return CARD_PALETTES.obsidian;
}

