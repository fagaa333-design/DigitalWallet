import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { CardPresentationItem } from '../../types/presentation-types';
import { useWalletTheme } from '../../theme';
import { UiIcon } from '../icons/UiIcon';
import { DigitalWalletCard } from '../cards/DigitalWalletCard';

interface CardDetailModalProps {
  card: CardPresentationItem | null;
  visible: boolean;
  onClose: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  visible,
  onClose,
}) => {
  const { colors, typography, spacing, borderRadius } = useWalletTheme();

  if (!card) {
    return null;
  }

  const detailsEntries = Object.entries(card.details);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: borderRadius.xxl,
              borderTopRightRadius: borderRadius.xxl,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Grab handle */}
          <View style={styles.handleWrapper}>
            <View
              style={[styles.handleBar, { backgroundColor: colors.border }]}
            />
          </View>

          {/* Modal Header */}
          <View style={[styles.headerRow, { paddingHorizontal: spacing.lg }]}>
            <View style={styles.headerTextCol}>
              <Text style={[typography.overline, { color: colors.textSecondary }]}>
                DETALLES DEL ELEMENTO
              </Text>
              <Text
                style={[
                  typography.headline,
                  { color: colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {card.title}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar detalles"
            >
              <UiIcon name="close" size={14} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: spacing.lg },
            ]}
          >
            {/* Card Preview */}
            <View style={styles.cardPreviewWrapper}>
              <DigitalWalletCard card={card} size="compact" />
            </View>

            {/* Simulated QR / Barcode Section */}
            <View
              style={[
                styles.codeSection,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                },
              ]}
            >
              <View style={styles.codeHeader}>
                <UiIcon name="shield" size={16} color={colors.success} />
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textPrimary, fontWeight: '600' },
                  ]}
                >
                  Código de Identificación Criptográfico
                </Text>
              </View>

              {/* Barcode / QR geometric pattern simulation */}
              <View style={styles.barcodeBox}>
                <View style={styles.barcodeBars}>
                  {[3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3].map(
                    (w, i) => (
                      <View
                        key={i}
                        style={[
                          styles.barcodeLine,
                          {
                            width: w,
                            backgroundColor: colors.textPrimary,
                            marginRight: 2 + (i % 3),
                          },
                        ]}
                      />
                    ),
                  )}
                </View>
                <Text
                  style={[
                    typography.overline,
                    styles.barcodeHash,
                    { color: colors.textSecondary },
                  ]}
                >
                  HASH: {card.id.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Description */}
            {card.description && (
              <View style={styles.sectionBlock}>
                <Text
                  style={[
                    typography.overline,
                    styles.sectionTitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  DESCRIPCIÓN
                </Text>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textPrimary },
                  ]}
                >
                  {card.description}
                </Text>
              </View>
            )}

            {/* Details Table */}
            {detailsEntries.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text
                  style={[
                    typography.overline,
                    styles.sectionTitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  ATRIBUTOS Y CAMPOS
                </Text>
                <View
                  style={[
                    styles.detailsTable,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSubtle,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  {detailsEntries.map(([key, val], idx) => (
                    <View
                      key={key}
                      style={[
                        styles.detailRow,
                        idx < detailsEntries.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.textSecondary, textTransform: 'capitalize' },
                        ]}
                      >
                        {key.replace(/([A-Z])/g, ' $1')}
                      </Text>
                      <Text
                        style={[
                          typography.bodyMedium,
                          { color: colors.textPrimary, fontWeight: '600' },
                        ]}
                      >
                        {String(val)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Metadata Footer */}
            <View style={styles.metadataBlock}>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textTertiary, textAlign: 'center' },
                ]}
              >
                Protegido por enclave local • Creado el{' '}
                {new Date(card.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </ScrollView>

          {/* Action button */}
          <View style={[styles.modalActions, { padding: spacing.lg }]}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              style={[
                styles.doneButton,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Listo"
            >
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.textPrimary, fontWeight: '700' },
                ]}
              >
                Listo
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '88%',
    width: '100%',
    paddingBottom: 20,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTextCol: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  cardPreviewWrapper: {
    marginBottom: 16,
  },
  codeSection: {
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 18,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  barcodeBox: {
    alignItems: 'center',
  },
  barcodeBars: {
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
    marginBottom: 8,
  },
  barcodeLine: {
    height: '100%',
    borderRadius: 0.5,
  },
  barcodeHash: {
    fontSize: 9,
    letterSpacing: 1,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionTitle: {
    marginBottom: 6,
  },
  detailsTable: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  metadataBlock: {
    marginVertical: 12,
  },
  modalActions: {
    paddingTop: 8,
  },
  doneButton: {
    height: 48,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

