import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWalletTheme } from '../../theme';
import { UiIcon } from '../icons/UiIcon';

interface EmptyWalletStateProps {
  isSearching?: boolean;
  onResetSearch?: () => void;
  onAddCard?: () => void;
}

export const EmptyWalletState: React.FC<EmptyWalletStateProps> = ({
  isSearching,
  onResetSearch,
  onAddCard,
}) => {
  const { colors, typography, spacing, borderRadius } = useWalletTheme();

  return (
    <View style={[styles.container, { padding: spacing.xxl }]}>
      {/* Geometric Illustration Container */}
      <View
        style={[
          styles.illustrationCircle,
          {
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.cardGhost,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <UiIcon
            name={isSearching ? 'search' : 'wallet'}
            size={34}
            color={colors.accent}
          />
        </View>
      </View>

      <Text
        style={[
          typography.headline,
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {isSearching
          ? 'Sin resultados de búsqueda'
          : 'Tu billetera está vacía'}
      </Text>

      <Text
        style={[
          typography.body,
          styles.description,
          { color: colors.textSecondary },
        ]}
      >
        {isSearching
          ? 'No encontramos tarjetas ni documentos que coincidan con los criterios ingresados.'
          : 'Comienza agregando tu primera tarjeta, documento de identidad o membresía segura.'}
      </Text>

      {isSearching && onResetSearch ? (
        <TouchableOpacity
          onPress={onResetSearch}
          activeOpacity={0.75}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Limpiar filtros"
        >
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.accent, fontWeight: '600' },
            ]}
          >
            Limpiar búsqueda y filtros
          </Text>
        </TouchableOpacity>
      ) : onAddCard ? (
        <TouchableOpacity
          onPress={onAddCard}
          activeOpacity={0.8}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.accent,
              borderRadius: borderRadius.lg,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Añadir tarjeta ahora"
        >
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.accentContrast, fontWeight: '700' },
            ]}
          >
            Añadir tarjeta ahora
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  illustrationCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardGhost: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});

