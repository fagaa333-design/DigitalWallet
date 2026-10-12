import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  getBiometricsStatus,
  authenticateWithBiometrics,
  isPinConfigured,
  getPinLockoutStatus,
  verifyPin,
  setupPin,
  BiometricsStatus,
  PinLockoutStatus,
  VerifyPinResult,
} from '@/shared/security/auth-manager';

export interface WalletAuthContextValue {
  isLocked: boolean;
  isPinSet: boolean;
  biometricsStatus: BiometricsStatus;
  lockoutStatus: PinLockoutStatus;
  authLoading: boolean;
  authError: string | null;
  unlockWithBiometrics: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<VerifyPinResult>;
  lockWallet: () => void;
  configurePin: (newPin: string) => Promise<void>;
  refreshAuthStatus: () => Promise<void>;
  clearAuthError: () => void;
}

const WalletAuthContext = createContext<WalletAuthContextValue | undefined>(undefined);

export interface WalletAuthProviderProps {
  children: ReactNode;
  initialLocked?: boolean;
}

export const WalletAuthProvider: React.FC<WalletAuthProviderProps> = ({
  children,
  initialLocked = true,
}) => {
  const [isLocked, setIsLocked] = useState<boolean>(initialLocked);
  const [isPinSet, setIsPinSet] = useState<boolean>(false);
  const [biometricsStatus, setBiometricsStatus] = useState<BiometricsStatus>({
    hasHardware: false,
    isEnrolled: false,
    biometryType: 'NONE',
    available: false,
  });
  const [lockoutStatus, setLockoutStatus] = useState<PinLockoutStatus>({
    isLockedOut: false,
    lockoutRemainingSeconds: 0,
    failedAttempts: 0,
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const lockoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const refreshAuthStatus = useCallback(async () => {
    try {
      const [bio, hasPin, lockout] = await Promise.all([
        getBiometricsStatus(),
        isPinConfigured(),
        getPinLockoutStatus(),
      ]);

      if (isMountedRef.current) {
        setBiometricsStatus(bio);
        setIsPinSet(hasPin);
        setLockoutStatus(lockout);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Error al verificar el estado de autenticación.',
        );
      }
    } finally {
      if (isMountedRef.current) {
        setAuthLoading(false);
      }
    }
  }, []);

  // Countdown timer for lockout duration
  useEffect(() => {
    if (lockoutStatus.isLockedOut && lockoutStatus.lockoutRemainingSeconds > 0) {
      if (lockoutIntervalRef.current) {
        clearInterval(lockoutIntervalRef.current);
      }

      lockoutIntervalRef.current = setInterval(() => {
        setLockoutStatus((prev) => {
          if (prev.lockoutRemainingSeconds <= 1) {
            if (lockoutIntervalRef.current) {
              clearInterval(lockoutIntervalRef.current);
              lockoutIntervalRef.current = null;
            }
            return {
              isLockedOut: false,
              lockoutRemainingSeconds: 0,
              failedAttempts: prev.failedAttempts,
            };
          }
          return {
            ...prev,
            lockoutRemainingSeconds: prev.lockoutRemainingSeconds - 1,
          };
        });
      }, 1000);
    }

    return () => {
      if (lockoutIntervalRef.current) {
        clearInterval(lockoutIntervalRef.current);
        lockoutIntervalRef.current = null;
      }
    };
  }, [lockoutStatus.isLockedOut, lockoutStatus.lockoutRemainingSeconds]);

  // Initial check on mount
  useEffect(() => {
    isMountedRef.current = true;
    refreshAuthStatus();

    return () => {
      isMountedRef.current = false;
    };
  }, [refreshAuthStatus]);

  // AppState listener: Auto-lock when entering background or inactive state
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Enforce immediate session lockout
        setIsLocked(true);
        setAuthError(null);
      } else if (nextAppState === 'active') {
        // Refresh lockout countdown and biometrics status when returning to foreground
        refreshAuthStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [refreshAuthStatus]);

  const lockWallet = useCallback(() => {
    setIsLocked(true);
    setAuthError(null);
  }, []);

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await authenticateWithBiometrics();
      if (result.success) {
        setIsLocked(false);
        return true;
      }

      if (result.error && !result.cancelled) {
        setAuthError(result.error);
      }
      return false;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error durante la autenticación biométrica.';
      setAuthError(message);
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const unlockWithPin = useCallback(
    async (pin: string): Promise<VerifyPinResult> => {
      setAuthLoading(true);
      setAuthError(null);
      try {
        const result = await verifyPin(pin);
        if (result.success) {
          setIsLocked(false);
          await refreshAuthStatus();
          return { success: true };
        }

        if (result.error) {
          setAuthError(result.error);
        }
        await refreshAuthStatus();
        return result;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Error al verificar el PIN de seguridad.';
        setAuthError(message);
        return {
          success: false,
          error: message,
        };
      } finally {
        setAuthLoading(false);
      }
    },
    [refreshAuthStatus],
  );

  const configurePin = useCallback(
    async (newPin: string): Promise<void> => {
      setAuthLoading(true);
      setAuthError(null);
      try {
        await setupPin(newPin);
        setIsPinSet(true);
        setIsLocked(false);
        await refreshAuthStatus();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Error al configurar el nuevo PIN.';
        setAuthError(message);
        throw err;
      } finally {
        setAuthLoading(false);
      }
    },
    [refreshAuthStatus],
  );

  const value = useMemo<WalletAuthContextValue>(
    () => ({
      isLocked,
      isPinSet,
      biometricsStatus,
      lockoutStatus,
      authLoading,
      authError,
      unlockWithBiometrics,
      unlockWithPin,
      lockWallet,
      configurePin,
      refreshAuthStatus,
      clearAuthError,
    }),
    [
      isLocked,
      isPinSet,
      biometricsStatus,
      lockoutStatus,
      authLoading,
      authError,
      unlockWithBiometrics,
      unlockWithPin,
      lockWallet,
      configurePin,
      refreshAuthStatus,
      clearAuthError,
    ],
  );

  return (
    <WalletAuthContext.Provider value={value}>
      {children}
    </WalletAuthContext.Provider>
  );
};

export function useWalletAuth(): WalletAuthContextValue {
  const context = useContext(WalletAuthContext);
  if (!context) {
    throw new Error('useWalletAuth debe ser utilizado dentro de un WalletAuthProvider.');
  }
  return context;
}

export function useOptionalWalletAuth(): WalletAuthContextValue | undefined {
  return useContext(WalletAuthContext);
}
