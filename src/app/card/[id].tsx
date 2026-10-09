import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useWalletTheme } from '@/features/wallet/presentation/theme';
import { UiIcon } from '@/features/wallet/presentation/components/icons';
import { DigitalWalletCard } from '@/features/wallet/presentation/components/cards';
import { useWallet } from '@/features/wallet/presentation/context/wallet-context';

export default function CardDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, borderRadius } = useWalletTheme();
  const { getCardById, deleteCard } = useWallet();

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const card = id ? getCardById(id) : undefined;

  const handleCopy = () => {
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteCard(id);
      setIsDeleteModalVisible(false);
      router.back();
    } catch {
      setIsDeleting(false);
    }
  };

  if (!card) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <UiIcon name="arrowLeft" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>
            Detalle
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.notFoundContainer}>
          <View
            style={[
              styles.notFoundCircle,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            <UiIcon name="alert" size={32} color={colors.warning} />
          </View>
          <Text style={[typography.headline, { color: colors.textPrimary, marginBottom: 8 }]}>
            Elemento no encontrado
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
            La tarjeta o documento solicitado no existe o fue eliminado de la sesión.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accent,
                borderRadius: borderRadius.lg,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Regresar a la billetera"
          >
            <Text style={[typography.bodyMedium, { color: colors.accentContrast, fontWeight: '700' }]}>
              Regresar a la billetera
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const detailsEntries = Object.entries(card.details || {});

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.iconBtn,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <UiIcon name="arrowLeft" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[typography.headline, { color: colors.textPrimary }]}>
          Detalle del Documento
        </Text>

        <TouchableOpacity
          onPress={() => setIsDeleteModalVisible(true)}
          style={[
            styles.iconBtn,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Eliminar tarjeta"
        >
          <UiIcon name="trash" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg }]}
      >
        {/* Card Physical Representation */}
        <View style={styles.cardWrapper}>
          <DigitalWalletCard card={card} size="standard" />
        </View>

        {/* Quick action: Copy identifier */}
        <View style={styles.quickActionRow}>
          <TouchableOpacity
            onPress={handleCopy}
            activeOpacity={0.75}
            style={[
              styles.copyButton,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: copyFeedback ? colors.success : colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Copiar identificador"
          >
            <UiIcon
              name={copyFeedback ? 'check' : 'copy'}
              size={16}
              color={copyFeedback ? colors.success : colors.textPrimary}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: copyFeedback ? colors.success : colors.textPrimary,
                  fontWeight: '600',
                },
              ]}
            >
              {copyFeedback ? '¡Copiado a portapapeles!' : 'Copiar Identificador'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cryptographic identification code box */}
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
            <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}>
              Identificador Criptográfico Seguro
            </Text>
          </View>

          <View style={styles.barcodeBars}>
            {[3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3].map((w, i) => (
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
            ))}
          </View>
          <Text style={[typography.overline, { color: colors.textSecondary, letterSpacing: 1 }]}>
            UUID: {card.id.toUpperCase()}
          </Text>
        </View>

        {/* Description */}
        {card.description && (
          <View style={styles.sectionBlock}>
            <Text style={[typography.overline, styles.sectionTitle, { color: colors.textSecondary }]}>
              DESCRIPCIÓN
            </Text>
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              {card.description}
            </Text>
          </View>
        )}

        {/* Details Table */}
        {detailsEntries.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={[typography.overline, styles.sectionTitle, { color: colors.textSecondary }]}>
              ATRIBUTOS REGISTRADOS
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
                  <Text style={[typography.caption, { color: colors.textSecondary, textTransform: 'capitalize' }]}>
                    {key.replace(/([A-Z])/g, ' $1')}
                  </Text>
                  <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                    {String(val)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Metadata info */}
        <View style={styles.metadataBlock}>
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
            Registrado: {new Date(card.createdAt).toLocaleDateString()} • Bóveda local
          </Text>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setIsDeleteModalVisible(false)}
        >
          <Pressable
            style={[
              styles.deleteDialog,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.xl,
                padding: spacing.xl,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.deleteIconWrapper,
                { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
              ]}
            >
              <UiIcon name="trash" size={24} color={colors.danger} />
            </View>

            <Text style={[typography.headline, { color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }]}>
              ¿Eliminar elemento?
            </Text>

            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }]}>
              ¿Estás seguro de que deseas eliminar &quot;{card.title}&quot; de tu billetera? Esta acción no se puede deshacer.
            </Text>

            <View style={styles.dialogActions}>
              <TouchableOpacity
                onPress={() => setIsDeleteModalVisible(false)}
                style={[
                  styles.dialogBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    borderRadius: borderRadius.lg,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDelete}
                disabled={isDeleting}
                style={[
                  styles.dialogBtn,
                  {
                    backgroundColor: colors.danger,
                    borderRadius: borderRadius.lg,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Eliminar definitivamente"
              >
                <Text style={[typography.bodyMedium, { color: '#FFFFFF', fontWeight: '700' }]}>
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  cardWrapper: {
    marginVertical: 14,
  },
  quickActionRow: {
    marginBottom: 16,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderWidth: 1,
  },
  codeSection: {
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  barcodeBars: {
    flexDirection: 'row',
    height: 40,
    alignItems: 'center',
    marginBottom: 8,
  },
  barcodeLine: {
    height: '100%',
    borderRadius: 0.5,
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
    paddingVertical: 11,
  },
  metadataBlock: {
    marginVertical: 14,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteDialog: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  deleteIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  dialogBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});

