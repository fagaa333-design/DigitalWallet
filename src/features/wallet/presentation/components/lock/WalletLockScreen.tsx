import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWalletTheme } from '@/features/wallet/presentation/theme';
import { UiIcon } from '@/features/wallet/presentation/components/icons';
import { useWalletAuth } from '@/features/wallet/presentation/context/wallet-auth-context';

export const WalletLockScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useWalletTheme();
  const {
    isPinSet,
    biometricsStatus,
    lockoutStatus,
    authLoading,
    authError,
    unlockWithBiometrics,
    unlockWithPin,
    configurePin,
    clearAuthError,
  } = useWalletAuth();

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [setupStep, setSetupStep] = useState<'initial' | 'enter' | 'confirm'>(
    isPinSet ? 'initial' : 'enter',
  );
  const [firstPin, setFirstPin] = useState<string>('');
  const [setupFeedback, setSetupFeedback] = useState<string | null>(null);

  // Auto-prompt biometrics on initial mount if available and not locked out
  useEffect(() => {
    if (biometricsStatus.available && !lockoutStatus.isLockedOut && isPinSet) {
      unlockWithBiometrics();
    }
  }, [biometricsStatus.available, isPinSet, lockoutStatus.isLockedOut, unlockWithBiometrics]);

  // Handle PIN entry completion
  const handlePinComplete = useCallback(
    async (pin: string) => {
      clearAuthError();

      if (!isPinSet) {
        // First-time setup flow
        if (setupStep === 'enter') {
          if (pin.length < 4) {
            setSetupFeedback('El PIN debe tener al menos 4 dígitos.');
            setEnteredPin('');
            return;
          }
          setFirstPin(pin);
          setEnteredPin('');
          setSetupStep('confirm');
          setSetupFeedback('Vuelve a escribir el PIN para confirmarlo.');
        } else if (setupStep === 'confirm') {
          if (pin !== firstPin) {
            setSetupFeedback('Los PINs no coinciden. Inténtalo de nuevo.');
            setEnteredPin('');
            setSetupStep('enter');
            setFirstPin('');
            return;
          }
          try {
            await configurePin(pin);
          } catch {
            setSetupFeedback('Error al guardar el nuevo PIN.');
            setEnteredPin('');
            setSetupStep('enter');
          }
        }
        return;
      }

      // Normal unlock flow
      const result = await unlockWithPin(pin);
      if (!result.success) {
        setEnteredPin('');
      }
    },
    [clearAuthError, configurePin, firstPin, isPinSet, setupStep, unlockWithPin],
  );

  const handleKeyPress = (num: string) => {
    if (lockoutStatus.isLockedOut || authLoading) return;
    if (enteredPin.length >= 6) return;

    const nextPin = enteredPin + num;
    setEnteredPin(nextPin);

    // Auto-verify if length reaches 4 or 6 (for standard 4-digit PINs, verify at 4 if configured, or user continues)
    if (isPinSet && nextPin.length === 4) {
      handlePinComplete(nextPin);
    } else if (!isPinSet && setupStep === 'confirm' && nextPin.length === firstPin.length) {
      handlePinComplete(nextPin);
    }
  };

  const handleDelete = () => {
    if (lockoutStatus.isLockedOut || authLoading) return;
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const handleManualBiometrics = () => {
    if (lockoutStatus.isLockedOut || authLoading) return;
    unlockWithBiometrics();
  };

  const isLockedOut = lockoutStatus.isLockedOut && lockoutStatus.lockoutRemainingSeconds > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Security Brand Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.shieldHalo,
            {
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              borderColor: colors.accent,
            },
          ]}
        >
          <UiIcon name="shield" size={42} color={colors.accent} />
        </View>

        <Text style={[typography.titleLarge, { color: colors.textPrimary, marginTop: 14 }]}>
          Digital Wallet
        </Text>

        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
          BÓVEDA PROTEGIDA EN REPOSO
        </Text>
      </View>

      {/* Status / Instructions Section */}
      <View style={styles.statusSection}>
        {isLockedOut ? (
          <View
            style={[
              styles.alertCard,
              {
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderColor: colors.danger,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <UiIcon name="alert" size={18} color={colors.danger} />
            <Text style={[typography.bodyMedium, { color: colors.danger, fontWeight: '700' }]}>
              Bloqueo temporal de seguridad
            </Text>
            <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>
              Demasiados intentos erróneos. Espera {lockoutStatus.lockoutRemainingSeconds} segundos.
            </Text>
          </View>
        ) : !isPinSet ? (
          <View style={styles.setupInfo}>
            <Text style={[typography.headline, { color: colors.textPrimary, textAlign: 'center' }]}>
              {setupStep === 'confirm' ? 'Confirmar PIN de Seguridad' : 'Configurar PIN de Acceso'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              {setupFeedback ?? 'Crea un PIN numérico de 4 a 6 dígitos para proteger tu billetera.'}
            </Text>
          </View>
        ) : (
          <View style={styles.setupInfo}>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
              Ingresa tu PIN de desbloqueo
            </Text>
            {authError && (
              <Text style={[typography.caption, { color: colors.danger, textAlign: 'center', marginTop: 4, fontWeight: '600' }]}>
                {authError}
              </Text>
            )}
          </View>
        )}

        {/* PIN Indicators (Dots) */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = enteredPin.length > index;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    borderColor: isFilled ? colors.accent : colors.border,
                    backgroundColor: isFilled ? colors.accent : 'transparent',
                  },
                ]}
              />
            );
          })}
        </View>

        {authLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 8 }]}>
              Verificando credenciales...
            </Text>
          </View>
        )}
      </View>

      {/* Numeric Keypad */}
      <View style={styles.keypadContainer}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rIndex) => (
          <View key={rIndex} style={styles.keypadRow}>
            {row.map((digit) => (
              <TouchableOpacity
                key={digit}
                onPress={() => handleKeyPress(digit)}
                disabled={isLockedOut || authLoading}
                activeOpacity={0.65}
                style={[
                  styles.keypadBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={digit}
              >
                <Text style={[typography.titleLarge, { color: colors.textPrimary, fontWeight: '600' }]}>
                  {digit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Bottom Keypad Row: Biometrics / 0 / Delete */}
        <View style={styles.keypadRow}>
          {biometricsStatus.available && isPinSet ? (
            <TouchableOpacity
              onPress={handleManualBiometrics}
              disabled={isLockedOut || authLoading}
              activeOpacity={0.65}
              style={[
                styles.keypadBtn,
                styles.specialBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: borderRadius.full,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Autenticación biométrica"
            >
              <UiIcon
                name={biometricsStatus.biometryType === 'FACE' ? 'badge' : 'shield'}
                size={22}
                color={colors.accent}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.keypadBtnEmpty} />
          )}

          <TouchableOpacity
            onPress={() => handleKeyPress('0')}
            disabled={isLockedOut || authLoading}
            activeOpacity={0.65}
            style={[
              styles.keypadBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                borderRadius: borderRadius.full,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="0"
          >
            <Text style={[typography.titleLarge, { color: colors.textPrimary, fontWeight: '600' }]}>
              0
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            disabled={isLockedOut || authLoading || enteredPin.length === 0}
            activeOpacity={0.65}
            style={[
              styles.keypadBtn,
              styles.specialBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                borderRadius: borderRadius.full,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Borrar dígito"
          >
            <UiIcon
              name="close"
              size={18}
              color={enteredPin.length > 0 ? colors.textPrimary : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Security Note */}
      <View style={styles.footer}>
        <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
          Cifrado con SQLCipher y AES-GCM • Claves en hardware seguro
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
  },
  shieldHalo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  alertCard: {
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    width: '100%',
    maxWidth: 320,
    marginBottom: 12,
  },
  setupInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 16,
    justifyContent: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    gap: 14,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keypadBtn: {
    width: 72,
    height: 72,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadBtnEmpty: {
    width: 72,
    height: 72,
  },
  specialBtn: {
    opacity: 0.9,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 8,
  },
});
