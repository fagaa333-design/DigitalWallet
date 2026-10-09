import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useWalletTheme } from '../../theme';
import { UiIcon } from '../icons/UiIcon';

interface AddCardButtonProps {
  onPress: () => void;
  label?: string;
  style?: ViewStyle;
}

export const AddCardButton: React.FC<AddCardButtonProps> = ({
  onPress,
  label = 'Añadir tarjeta o documento',
  style,
}) => {
  const { colors, typography, spacing, borderRadius, elevation } =
    useWalletTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.container,
        elevation.floatingButton,
        {
          backgroundColor: colors.accent,
          borderRadius: borderRadius.xl,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md + 2,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre las opciones para añadir una nueva tarjeta"
    >
      <UiIcon
        name="plus"
        size={18}
        color={colors.accentContrast}
        style={styles.icon}
      />
      <Text
        style={[
          typography.bodyMedium,
          styles.text,
          { color: colors.accentContrast },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

