import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useWalletTheme } from '../../theme';

interface CardBadgeProps {
  label: string;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
}

export const CardBadge: React.FC<CardBadgeProps> = ({
  label,
  backgroundColor,
  textColor,
  style,
}) => {
  const { borderRadius, typography, spacing } = useWalletTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius: borderRadius.full,
          backgroundColor: backgroundColor ?? 'rgba(255, 255, 255, 0.18)',
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: spacing.xxs + 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          typography.caption,
          styles.text,
          { color: textColor ?? '#FFFFFF' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.3,
  },
});

