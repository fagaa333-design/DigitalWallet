import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { CardPresentationItem } from '../../types/presentation-types';
import { useWalletTheme } from '../../theme';
import { UiIcon } from '../icons/UiIcon';
import { CardBadge } from './CardBadge';

interface DigitalWalletCardProps {
  card: CardPresentationItem;
  onPress?: (card: CardPresentationItem) => void;
  size?: 'standard' | 'compact';
  style?: ViewStyle;
}

export const DigitalWalletCard: React.FC<DigitalWalletCardProps> = ({
  card,
  onPress,
  size = 'standard',
  style,
}) => {
  const { getCardPalette, borderRadius, typography, spacing, elevation } =
    useWalletTheme();

  const palette = getCardPalette(card.color);
  const isCompact = size === 'compact';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress?.(card)}
      style={[
        styles.outerContainer,
        elevation.card,
        {
          borderRadius: borderRadius.xl,
          borderColor: palette.border,
          backgroundColor: palette.background,
        },
        isCompact ? styles.compactContainer : styles.standardContainer,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${card.category}`}
      accessibilityHint="Toca para ver los detalles completos de la tarjeta"
    >
      {/* Texture accent overlay */}
      <View
        style={[
          styles.ambientCircle,
          {
            backgroundColor: palette.accent,
            opacity: 0.12,
            right: -40,
            top: -40,
            width: isCompact ? 140 : 190,
            height: isCompact ? 140 : 190,
            borderRadius: 9999,
          },
        ]}
      />

      {/* Header section: Category Badge & Icon */}
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <CardBadge
            label={card.badgeLabel ?? card.category}
            backgroundColor={palette.badgeBg}
            textColor={palette.badgeText}
          />
        </View>

        <View style={styles.headerRight}>
          {/* Contactless waves symbol */}
          <View style={styles.contactlessContainer}>
            <View
              style={[
                styles.contactlessArc,
                {
                  width: 14,
                  height: 14,
                  borderColor: palette.textSecondary,
                  borderRightWidth: 1.6,
                  borderTopWidth: 1.6,
                },
              ]}
            />
            <View
              style={[
                styles.contactlessArc,
                {
                  width: 20,
                  height: 20,
                  borderColor: palette.textSecondary,
                  borderRightWidth: 1.6,
                  borderTopWidth: 1.6,
                },
              ]}
            />
          </View>

          {card.icon && (
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
              ]}
            >
              <UiIcon name={card.icon} size={16} color={palette.textPrimary} />
            </View>
          )}
        </View>
      </View>

      {/* Middle section: EMV Chip & Title */}
      <View style={styles.cardMiddle}>
        {/* EMV Chip graphic */}
        <View
          style={[
            styles.emvChip,
            {
              backgroundColor: '#D4AF37', // Gold metallic tone
              borderColor: '#B8860B',
            },
          ]}
        >
          <View style={styles.emvLineH} />
          <View style={styles.emvLineV} />
          <View style={styles.emvInnerBox} />
        </View>

        <View style={styles.titleWrapper}>
          <Text
            style={[
              isCompact ? typography.headline : typography.cardTitle,
              { color: palette.textPrimary },
            ]}
            numberOfLines={1}
          >
            {card.title}
          </Text>
          {card.subtitle && (
            <Text
              style={[
                typography.caption,
                styles.subtitle,
                { color: palette.textSecondary },
              ]}
              numberOfLines={1}
            >
              {card.subtitle}
            </Text>
          )}
        </View>
      </View>

      {/* Footer section: Masked identifier & Expiration */}
      <View style={styles.cardFooter}>
        <View style={styles.idWrapper}>
          <Text
            style={[
              typography.overline,
              styles.identifierLabel,
              { color: palette.textSecondary },
            ]}
          >
            NÚMERO / REGISTRO
          </Text>
          <Text
            style={[
              isCompact ? typography.bodyMedium : typography.cardNumber,
              styles.identifierValue,
              { color: palette.textPrimary },
            ]}
            numberOfLines={1}
          >
            {card.maskedNumber ?? '•••• ••••'}
          </Text>
        </View>

        {card.expiresText && (
          <View style={styles.expiryWrapper}>
            <Text
              style={[
                typography.overline,
                styles.identifierLabel,
                { color: palette.textSecondary },
              ]}
            >
              VÁLIDO HASTA
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                styles.expiryValue,
                { color: palette.textPrimary },
              ]}
            >
              {card.expiresText}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
  },
  standardContainer: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 206,
  },
  compactContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 168,
  },
  ambientCircle: {
    position: 'absolute',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactlessContainer: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  contactlessArc: {
    position: 'absolute',
    borderRadius: 9999,
    transform: [{ rotate: '45deg' }],
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 12,
  },
  emvChip: {
    width: 36,
    height: 26,
    borderRadius: 5,
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  emvLineH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  emvLineV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  emvInnerBox: {
    width: 16,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.22)',
  },
  titleWrapper: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
    opacity: 0.85,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  idWrapper: {
    flex: 1,
  },
  identifierLabel: {
    fontSize: 9,
    marginBottom: 2,
  },
  identifierValue: {
    fontFamily: 'monospace',
    letterSpacing: 1.5,
  },
  expiryWrapper: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  expiryValue: {
    fontWeight: '600',
  },
});

