import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWalletTheme } from '../../theme';
import { UiIcon } from '../icons/UiIcon';

interface HeaderBarProps {
  onPressSettings: () => void;
  title?: string;
  greeting?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onPressSettings,
  title = 'Digital Wallet',
  greeting = 'Bóveda Segura',
}) => {
  const { colors, typography, spacing, borderRadius } = useWalletTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg }]}>
      <View style={styles.textContainer}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.shieldDot,
              { backgroundColor: colors.success },
            ]}
          />
          <Text
            style={[
              typography.overline,
              { color: colors.textSecondary },
            ]}
          >
            {greeting}
          </Text>
        </View>
        <Text
          style={[
            typography.titleLarge,
            styles.titleText,
            { color: colors.textPrimary },
          ]}
        >
          {title}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onPressSettings}
        activeOpacity={0.7}
        style={[
          styles.settingsButton,
          {
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
            borderRadius: borderRadius.lg,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Ajustes de la billetera"
      >
        <UiIcon name="settings" size={18} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  textContainer: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  shieldDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  titleText: {
    letterSpacing: -0.6,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

