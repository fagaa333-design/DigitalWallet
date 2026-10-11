import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWalletTheme } from '@/features/wallet/presentation/theme';
import { UiIcon } from '@/features/wallet/presentation/components/icons';
import { DigitalWalletCard } from '@/features/wallet/presentation/components/cards';
import { useWallet } from '@/features/wallet/presentation/context/wallet-context';
import { CardPresentationItem, CategoryFilterKey } from '@/features/wallet/presentation/types/presentation-types';
import { WalletItemType, WALLET_ITEM_TYPES } from '@/features/wallet/domain/wallet-item';
import { CARD_PALETTES } from '@/features/wallet/presentation/theme/colors';
import {
  pickAndEncryptImage,
  deleteEncryptedImage,
} from '@/features/wallet/services/image-storage-service';

const CATEGORIES: CategoryFilterKey[] = [
  'Identificación',
  'Finanzas',
  'Estudio',
  'Transporte',
  'Membresías',
  'Otras',
];

const ITEM_TYPE_LABELS: Record<WalletItemType, string> = {
  card: 'Tarjeta',
  document: 'Documento',
  membership: 'Membresía',
  ticket: 'Boleto/Pase',
  credential: 'Credencial',
  custom: 'Personalizado',
};

const PALETTE_KEYS = Object.keys(CARD_PALETTES);

export default function NewCardRoute() {
  const { colors, typography, spacing, borderRadius } = useWalletTheme();
  const { addCard } = useWallet();

  // Form state
  const [type, setType] = useState<WalletItemType>('card');
  const [category, setCategory] = useState<string>('Finanzas');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [maskedNumber, setMaskedNumber] = useState('');
  const [expiresText, setExpiresText] = useState('');
  const [description, setDescription] = useState('');
  const [colorKey, setColorKey] = useState<string>('obsidian');
  const [imageId, setImageId] = useState<string | null>(null);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);

  // UI status
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live card preview object
  const previewCard: CardPresentationItem = {
    id: 'preview-card',
    type,
    category,
    title: title.trim() || 'Título de la Tarjeta',
    subtitle: subtitle.trim() || 'Emisor o Subtítulo',
    description: description.trim() || null,
    imageId: imageId ?? null,
    color: colorKey,
    icon: type === 'document' ? 'badge' : type === 'ticket' ? 'transit' : type === 'membership' ? 'star' : type === 'credential' ? 'book' : 'card',
    badgeLabel: category,
    maskedNumber: maskedNumber.trim() || '•••• ••••',
    issuer: subtitle.trim() || 'Emisor Desconocido',
    expiresText: expiresText.trim() || undefined,
    details: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handlePickImage = async () => {
    setIsPickingImage(true);
    setErrorMessage(null);
    try {
      const result = await pickAndEncryptImage();
      if (result.cancelled) {
        return;
      }
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      if (result.fileId && result.previewDataUri) {
        if (imageId) {
          deleteEncryptedImage(imageId);
        }
        setImageId(result.fileId);
        setImagePreviewUri(result.previewDataUri);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error al procesar la imagen.',
      );
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleRemoveImage = () => {
    if (imageId) {
      deleteEncryptedImage(imageId);
    }
    setImageId(null);
    setImagePreviewUri(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage('Por favor ingresa un título o nombre para la tarjeta.');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      await addCard({
        type,
        category,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        description: description.trim() || null,
        imageId: imageId ?? null,
        color: colorKey,
        icon: previewCard.icon,
        badgeLabel: category,
        maskedNumber: maskedNumber.trim() || '•••• ••••',
        issuer: subtitle.trim() || 'Emisor Desconocido',
        expiresText: expiresText.trim() || undefined,
        details: {
          origen: 'Creación Manual',
          modo: 'Bóveda Local',
        },
      });

      router.back();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error al guardar la tarjeta.',
      );
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
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
            Añadir Elemento
          </Text>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg }]}
        >
          {/* Live Card Preview */}
          <Text style={[typography.overline, { color: colors.textSecondary, marginBottom: 8 }]}>
            VISTA PREVIA EN TIEMPO REAL
          </Text>
          <View style={styles.previewContainer}>
            <DigitalWalletCard card={previewCard} size="standard" />
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderColor: colors.danger,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <UiIcon name="alert" size={16} color={colors.danger} />
              <Text style={[typography.caption, { color: colors.danger, flex: 1, fontWeight: '600' }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Form: Tipo de Elemento */}
          <View style={styles.formSection}>
            <Text style={[typography.caption, styles.fieldLabel, { color: colors.textPrimary }]}>
              Tipo de Elemento
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
              {WALLET_ITEM_TYPES.map((itemType) => {
                const isSelected = type === itemType;
                return (
                  <TouchableOpacity
                    key={itemType}
                    onPress={() => setType(itemType)}
                    style={[
                      styles.pillOption,
                      {
                        borderRadius: borderRadius.full,
                        borderColor: isSelected ? colors.accent : colors.border,
                        backgroundColor: isSelected ? colors.accent : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isSelected ? colors.accentContrast : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {ITEM_TYPE_LABELS[itemType]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Form: Categoría */}
          <View style={styles.formSection}>
            <Text style={[typography.caption, styles.fieldLabel, { color: colors.textPrimary }]}>
              Categoría
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.pillOption,
                      {
                        borderRadius: borderRadius.full,
                        borderColor: isSelected ? colors.accent : colors.border,
                        backgroundColor: isSelected ? colors.accent : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isSelected ? colors.accentContrast : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Form: Acabado Visual / Color */}
          <View style={styles.formSection}>
            <Text style={[typography.caption, styles.fieldLabel, { color: colors.textPrimary }]}>
              Acabado de Tarjeta
            </Text>
            <View style={styles.paletteRow}>
              {PALETTE_KEYS.map((key) => {
                const pal = CARD_PALETTES[key];
                const isSelected = colorKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setColorKey(key)}
                    style={[
                      styles.paletteCircle,
                      {
                        backgroundColor: pal.background,
                        borderColor: isSelected ? colors.accent : pal.border,
                        borderWidth: isSelected ? 3 : 1.5,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={pal.name}
                  >
                    {isSelected && (
                      <View style={[styles.paletteInnerDot, { backgroundColor: pal.accent }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Form: Título */}
          <View style={styles.formSection}>
            <Text style={[typography.caption, styles.fieldLabel, { color: colors.textPrimary }]}>
              Título o Nombre *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Visa Platinum, DNI, Credencial..."
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.textInput,
                typography.bodyMedium,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  borderRadius: borderRadius.md,
                },
              ]}
            />
          </View>

          {/* Form: Emisor / Subtítulo */}
          <View style={styles.formSection}>
            <Text style={[typography.caption, styles.fieldLabel, { color: colors.textPrimary }]}>
              Emisor o Subtítulo
            </Text>
            <TextInput
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="Ej. Banco Santander, Universidad..."
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.textInput,
                typography.bodyMedium,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  borderRadius: borderRadius.md,
                },
              ]}
            />
          </View>

          {/* Form: Número / Identificador Enmascarado */}
          <View style={styles.formRow}>
            <View style={[styles.formSection, { flex: 1, marginRight: 8 }]}>
              <Text style={[typography.caption, styles.fieldLabel, { color: colors.textPrimary }]}>
                Número / Código
              </Text>
              <TextInput
                value={maskedNumber}
                onChangeText={setMaskedNumber}
                placeholder="•••• 1234"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.textInput,
                  typography.bodyMedium,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    borderRadius: borderRadius.md,
                  },
                ]}
              />
            </View>

            <View style={[styles.formSection, { width: 120 }]}>
              <Text style={[typography.caption, styles.fieldLabel, { color: colors.textPrimary }]}>
                Validez
              </Text>
              <TextInput
                value={expiresText}
                onChangeText={setExpiresText}
                placeholder="MM/AA"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.textInput,
                  typography.bodyMedium,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    borderRadius: borderRadius.md,
                  },
                ]}
              />
            </View>
          </View>

          {/* Form: Descripción */}
          <View style={styles.formSection}>
            <Text style={[typography.caption, styles.fieldLabel, { color: colors.textPrimary }]}>
              Descripción Adicional (Opcional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Notas o detalles adicionales..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              style={[
                styles.textInput,
                styles.textArea,
                typography.bodyMedium,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  borderRadius: borderRadius.md,
                },
              ]}
            />
          </View>

          {/* Form: Documento o Fotografía Adjunta */}
          <View style={styles.formSection}>
            <Text style={[typography.caption, styles.fieldLabel, { color: colors.textPrimary }]}>
              Documento o Fotografía Adjunta (Cifrado AES-GCM)
            </Text>
            {imagePreviewUri ? (
              <View
                style={[
                  styles.imagePreviewBox,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Image
                  source={{ uri: imagePreviewUri }}
                  style={[styles.imagePreview, { borderRadius: borderRadius.sm }]}
                  resizeMode="cover"
                />
                <View style={styles.imageInfoContainer}>
                  <View style={styles.imageSecureTag}>
                    <UiIcon name="shield" size={14} color={colors.success} />
                    <Text style={[typography.caption, { color: colors.success, fontWeight: '600' }]}>
                      Cifrado seguro (.dwf)
                    </Text>
                  </View>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Archivo autenticado en reposo con AES-GCM de 256 bits.
                  </Text>
                  <TouchableOpacity
                    onPress={handleRemoveImage}
                    style={[
                      styles.removeImageBtn,
                      {
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderColor: colors.danger,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar fotografía"
                  >
                    <UiIcon name="trash" size={14} color={colors.danger} />
                    <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>
                      Quitar Fotografía
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickImage}
                disabled={isPickingImage}
                style={[
                  styles.imagePickerBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Adjuntar foto o documento seguro"
              >
                {isPickingImage ? (
                  <View style={styles.pickingLoadingRow}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 8 }]}>
                      Cifrando fotografía de forma segura...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.pickerContentRow}>
                    <UiIcon name="image" size={24} color={colors.accent} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
                        Adjuntar foto o documento seguro
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                        Se cifrará con AES-GCM (JPG, PNG, WEBP • Máx. 5 MB)
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Security Notice */}
          <View
            style={[
              styles.securityNotice,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <UiIcon name="shield" size={16} color={colors.success} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              Esta tarjeta y sus archivos adjuntos se almacenan cifrados con SQLCipher y AES-GCM, protegiendo tus datos en todo momento.
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={submitting}
            activeOpacity={0.85}
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.accent,
                borderRadius: borderRadius.xl,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Guardar tarjeta"
          >
            <Text style={[typography.bodyMedium, { color: colors.accentContrast, fontWeight: '700' }]}>
              {submitting ? 'Guardando...' : 'Guardar en la Billetera'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 36,
  },
  previewContainer: {
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  formSection: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  fieldLabel: {
    fontWeight: '600',
    marginBottom: 8,
  },
  pillsScroll: {
    flexDirection: 'row',
  },
  pillOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  paletteCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    marginVertical: 16,
  },
  saveBtn: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  imagePickerBtn: {
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  pickingLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  imagePreviewBox: {
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
  },
  imagePreview: {
    width: 84,
    height: 84,
  },
  imageInfoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  imageSecureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
});

