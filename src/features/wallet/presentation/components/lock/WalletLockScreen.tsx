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

type ScreenMode = 'unlock' | 'setup' | 'recovery';
type FlowStep = 'enter' | 'confirm';

export const WalletLockScreen: React.FC = () => {
  const { colors, typography, spacing, borderRadius } = useWalletTheme();
  const {
    isPinSet,
    configuredPinLength,
    biometricsStatus,
    lockoutStatus,
    authLoading,
    authError,
    unlockWithBiometrics,
    unlockWithPin,
    configurePin,
    verifyBiometricForRecovery,
    recoverPinWithBiometrics,
    clearAuthError,
  } = useWalletAuth();

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [screenMode, setScreenMode] = useState<ScreenMode>(isPinSet ? 'unlock' : 'setup');
  const [flowStep, setFlowStep] = useState<FlowStep>('enter');
  const [firstPin, setFirstPin] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Sync mode if isPinSet changes
  useEffect(() => {
    if (!isPinSet) {
      setScreenMode('setup');
      setFlowStep('enter');
    } else if (screenMode === 'setup') {
      setScreenMode('unlock');
    }
  }, [isPinSet, screenMode]);

  // Auto-prompt biometrics on initial mount if available and not locked out
  useEffect(() => {
    if (screenMode === 'unlock' && biometricsStatus.available && !lockoutStatus.isLockedOut && isPinSet) {
      unlockWithBiometrics();
    }
  }, [biometricsStatus.available, isPinSet, lockoutStatus.isLockedOut, screenMode, unlockWithBiometrics]);

  // Compute number of dot indicators to show
  const getExpectedDotsCount = (): number => {
    if (screenMode === 'unlock') {
      return configuredPinLength ?? 6;
    }
    if (flowStep === 'confirm') {
      return firstPin.length;
    }
    // Setup or Recovery 'enter' step: show dynamic dots up to 6 or max(4, enteredPin.length)
    return Math.max(4, Math.min(6, Math.max(enteredPin.length, 4)));
  };

  const handlePinComplete = useCallback(
    async (pin: string) => {
      clearAuthError();

      if (pin.length < 4 || pin.length > 6) {
        setFeedbackMessage('El PIN debe tener entre 4 y 6 dígitos.');
        return;
      }

      if (screenMode === 'setup' || screenMode === 'recovery') {
        if (flowStep === 'enter') {
          setFirstPin(pin);
          setEnteredPin('');
          setFlowStep('confirm');
          setFeedbackMessage('Vuelve a escribir el PIN para confirmarlo.');
        } else if (flowStep === 'confirm') {
          if (pin !== firstPin) {
            setFeedbackMessage('Los PINs no coinciden. Inténtalo de nuevo.');
            setEnteredPin('');
            setFlowStep('enter');
            setFirstPin('');
            return;
          }

          try {
            if (screenMode === 'setup') {
              await configurePin(pin);
            } else {
              const res = await recoverPinWithBiometrics(pin);
              if (!res.success) {
                setFeedbackMessage(res.error ?? 'Error al restablecer el PIN con biometría.');
                setEnteredPin('');
                setFlowStep('enter');
                setFirstPin('');
                return;
              }
              setScreenMode('unlock');
            }
          } catch {
            setFeedbackMessage('Error al guardar el nuevo PIN.');
            setEnteredPin('');
            setFlowStep('enter');
            setFirstPin('');
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
    [
      clearAuthError,
      configurePin,
      firstPin,
      flowStep,
      recoverPinWithBiometrics,
      screenMode,
      unlockWithPin,
    ],
  );

  const handleKeyPress = (num: string) => {
    if (lockoutStatus.isLockedOut || authLoading) return;
    if (enteredPin.length >= 6) return;

    const nextPin = enteredPin + num;
    setEnteredPin(nextPin);

    // Auto-verify scenarios:
    // 1. Normal unlock with known configuredPinLength
    if (screenMode === 'unlock' && configuredPinLength && nextPin.length === configuredPinLength) {
      handlePinComplete(nextPin);
    }
    // 2. Confirm step in setup or recovery where length matches firstPin
    else if ((screenMode === 'setup' || screenMode === 'recovery') && flowStep === 'confirm' && nextPin.length === firstPin.length) {
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

  const handleStartBiometricRecovery = async () => {
    clearAuthError();
    setFeedbackMessage(null);
    const result = await verifyBiometricForRecovery();
    if (result.success) {
      setScreenMode('recovery');
      setFlowStep('enter');
      setEnteredPin('');
      setFirstPin('');
      setFeedbackMessage('Ingresa tu nuevo PIN de 4 a 6 dígitos.');
    } else if (result.error) {
      setFeedbackMessage(result.error);
    }
  };

  const handleCancelRecovery = () => {
    setScreenMode('unlock');
    setFlowStep('enter');
    setEnteredPin('');
    setFirstPin('');
    setFeedbackMessage(null);
    clearAuthError();
  };

  const isLockedOut = lockoutStatus.isLockedOut && lockoutStatus.lockoutRemainingSeconds > 0;
  const isSubmitDisabled =
    enteredPin.length < 4 ||
    enteredPin.length > 6 ||
    isLockedOut ||
    authLoading ||
    (flowStep === 'confirm' && (screenMode === 'setup' || screenMode === 'recovery') && enteredPin.length !== firstPin.length);

  const dotsCount = getExpectedDotsCount();

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
        ) : screenMode === 'setup' || screenMode === 'recovery' ? (
          <View style={styles.setupInfo}>
            <Text style={[typography.headline, { color: colors.textPrimary, textAlign: 'center' }]}>
              {screenMode === 'recovery'
                ? flowStep === 'confirm'
                  ? 'Confirmar Nuevo PIN'
                  : 'Restablecer PIN de Seguridad'
                : flowStep === 'confirm'
                  ? 'Confirmar PIN de Seguridad'
                  : 'Configurar PIN de Acceso'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              {feedbackMessage ??
                (flowStep === 'confirm'
                  ? 'Vuelve a escribir el PIN para confirmarlo.'
                  : 'Crea un PIN numérico de 4 a 6 dígitos para proteger tu billetera.')}
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
            {feedbackMessage && !authError && (
              <Text style={[typography.caption, { color: colors.accent, textAlign: 'center', marginTop: 4, fontWeight: '600' }]}>
                {feedbackMessage}
              </Text>
            )}
          </View>
        )}

        {/* PIN Indicators (Dots) */}
        <View style={styles.dotsRow}>
          {Array.from({ length: dotsCount }).map((_, index) => {
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
          {biometricsStatus.available && screenMode === 'unlock' ? (
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

        {/* Explicit Action Button: Entrar / Continuar / Confirmar */}
        <TouchableOpacity
          onPress={() => handlePinComplete(enteredPin)}
          disabled={isSubmitDisabled}
          activeOpacity={0.8}
          style={[
            styles.submitButton,
            {
              backgroundColor: isSubmitDisabled ? colors.surfaceSubtle : colors.accent,
              borderColor: isSubmitDisabled ? colors.border : colors.accent,
              borderRadius: borderRadius.lg,
              opacity: isSubmitDisabled ? 0.5 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            screenMode === 'unlock'
              ? 'Entrar a la billetera'
              : flowStep === 'enter'
                ? 'Continuar'
                : 'Confirmar PIN'
          }
        >
          <Text
            style={[
              typography.bodyMedium,
              {
                color: isSubmitDisabled ? colors.textTertiary : colors.accentContrast,
                fontWeight: '700',
              },
            ]}
          >
            {screenMode === 'unlock'
              ? 'Entrar'
              : flowStep === 'enter'
                ? 'Continuar'
                : 'Confirmar'}
          </Text>
        </TouchableOpacity>

        {/* Biometric Recovery Option / Cancel Options */}
        {screenMode === 'unlock' && biometricsStatus.available && isPinSet ? (
          <TouchableOpacity
            onPress={handleStartBiometricRecovery}
            disabled={isLockedOut || authLoading}
            style={styles.recoveryLink}
            accessibilityRole="button"
            accessibilityLabel="Restablecer PIN mediante biometría"
          >
            <Text style={[typography.caption, { color: colors.accent, fontWeight: '600' }]}>
              ¿Olvidaste tu PIN? Restablecer con Biometría
            </Text>
          </TouchableOpacity>
        ) : screenMode === 'recovery' ? (
          <TouchableOpacity
            onPress={handleCancelRecovery}
            disabled={authLoading}
            style={styles.recoveryLink}
            accessibilityRole="button"
            accessibilityLabel="Cancelar restablecimiento"
          >
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
              Cancelar restablecimiento
            </Text>
          </TouchableOpacity>
        ) : null}
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
    marginTop: 16,
  },
  shieldHalo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  alertCard: {
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    width: '100%',
    maxWidth: 320,
    marginBottom: 8,
  },
  setupInfo: {
    alignItems: 'center',
    marginBottom: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: 12,
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keypadBtn: {
    width: 72,
    height: 68,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadBtnEmpty: {
    width: 72,
    height: 68,
  },
  specialBtn: {
    opacity: 0.9,
  },
  submitButton: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  recoveryLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 6,
  },
});
