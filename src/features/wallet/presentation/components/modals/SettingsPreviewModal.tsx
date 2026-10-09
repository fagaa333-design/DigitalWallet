import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { useWalletTheme } from '../../theme';
import { UiIcon } from '../icons/UiIcon';

interface SettingsPreviewModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsPreviewModal: React.FC<SettingsPreviewModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, typography, spacing, borderRadius, isDark } = useWalletTheme();

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
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <UiIcon name="settings" size={20} color={colors.textPrimary} />
              <Text
                style={[
                  typography.headline,
                  { color: colors.textPrimary },
                ]}
              >
                Ajustes & Seguridad
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeIconBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar ajustes"
            >
              <UiIcon name="close" size={14} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea}>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginBottom: 14 },
              ]}
            >
              Estado de la arquitectura de protección local en este dispositivo:
            </Text>

            {/* Diagnostics List */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <View style={styles.infoRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Modo de Almacenamiento
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.textPrimary, fontWeight: '600' },
                  ]}
                >
                  Offline Local (100%)
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

              <View style={styles.infoRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Motor de Base de Datos
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.textPrimary, fontWeight: '600' },
                  ]}
                >
                  SQLCipher (AES-256)
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

              <View style={styles.infoRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Cifrado de Archivos
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.textPrimary, fontWeight: '600' },
                  ]}
                >
                  AES-256-GCM (.dwf)
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

              <View style={styles.infoRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Tema Activo
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.textPrimary, fontWeight: '600' },
                  ]}
                >
                  {isDark ? 'Modo Oscuro' : 'Modo Claro'} (Sistema)
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

              <View style={styles.infoRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Versión del SDK
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.textPrimary, fontWeight: '600' },
                  ]}
                >
                  Expo 57 (RN 0.86)
                </Text>
              </View>
            </View>

            <View style={styles.securityNotice}>
              <UiIcon name="shield" size={14} color={colors.success} />
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, flex: 1 },
                ]}
              >
                Tus claves nunca salen del enclave seguro de hardware ni se transmiten a servidores externos.
              </Text>
            </View>
          </ScrollView>

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={[
              styles.closeBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Cerrar ajustes"
          >
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textPrimary, fontWeight: '700' },
              ]}
            >
              Cerrar
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
    maxWidth: 390,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    marginBottom: 16,
  },
  infoCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  closeBtn: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

