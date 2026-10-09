import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useWalletTheme } from '../../theme';
import { UiIcon } from '../icons/UiIcon';

interface AddCardNoticeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddCardNoticeModal: React.FC<AddCardNoticeModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, typography, spacing, borderRadius } = useWalletTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.xxl,
              padding: spacing.xl,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon Badge */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.accentMuted,
              },
            ]}
          >
            <UiIcon name="plus" size={24} color={colors.accent} />
          </View>

          <Text
            style={[
              typography.headline,
              styles.title,
              { color: colors.textPrimary },
            ]}
          >
            Añadir Nueva Tarjeta
          </Text>

          <Text
            style={[
              typography.body,
              styles.description,
              { color: colors.textSecondary },
            ]}
          >
            El flujo de captura e importación se integrará en el siguiente módulo
            mediante el servicio de ingestión segura de archivos.
          </Text>

          {/* Planned Features List */}
          <View
            style={[
              styles.featureList,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <View style={styles.featureItem}>
              <View
                style={[
                  styles.featureDot,
                  { backgroundColor: colors.accent },
                ]}
              />
              <Text
                style={[
                  typography.caption,
                  { color: colors.textPrimary, fontWeight: '600' },
                ]}
              >
                Escaneo con cámara (OCR en memoria)
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View
                style={[
                  styles.featureDot,
                  { backgroundColor: colors.accent },
                ]}
              />
              <Text
                style={[
                  typography.caption,
                  { color: colors.textPrimary, fontWeight: '600' },
                ]}
              >
                Cifrado automático a formato .dwf (AES-256-GCM)
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View
                style={[
                  styles.featureDot,
                  { backgroundColor: colors.accent },
                ]}
              />
              <Text
                style={[
                  typography.caption,
                  { color: colors.textPrimary, fontWeight: '600' },
                ]}
              >
                Persistencia en base local SQLCipher
              </Text>
            </View>
          </View>

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={[
              styles.closeBtn,
              {
                backgroundColor: colors.accent,
                borderRadius: borderRadius.lg,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Entendido"
          >
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.accentContrast, fontWeight: '700' },
              ]}
            >
              Entendido
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  featureList: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  closeBtn: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

