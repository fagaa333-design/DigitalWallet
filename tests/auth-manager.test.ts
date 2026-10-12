jest.mock('expo-secure-store', () => jest.requireActual('./mocks/secure-store').secureStoreMock);

const mockHasHardwareAsync = jest.fn();
const mockIsEnrolledAsync = jest.fn();
const mockSupportedTypesAsync = jest.fn();
const mockAuthenticateAsync = jest.fn();

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: () => mockHasHardwareAsync(),
  isEnrolledAsync: () => mockIsEnrolledAsync(),
  supportedAuthenticationTypesAsync: () => mockSupportedTypesAsync(),
  authenticateAsync: (opts?: unknown) => mockAuthenticateAsync(opts),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

import {
  setupPin,
  verifyPin,
  isPinConfigured,
  getConfiguredPinLength,
  getPinLockoutStatus,
  changePin,
  recoverPinWithBiometrics,
  verifyBiometricForRecovery,
  removePinConfig,
  getBiometricsStatus,
  authenticateWithBiometrics,
  pbkdf2HmacSha256,
  constantTimeCompare,
} from '@/shared/security/auth-manager';
import { secureStoreMock } from './mocks/secure-store';

describe('auth-manager', () => {
  beforeEach(() => {
    secureStoreMock.reset();
    mockHasHardwareAsync.mockReset();
    mockIsEnrolledAsync.mockReset();
    mockSupportedTypesAsync.mockReset();
    mockAuthenticateAsync.mockReset();
  });

  describe('PIN Cryptography & Setup', () => {
    it('rejects invalid PIN formats', async () => {
      await expect(setupPin('12')).rejects.toThrow('El PIN debe tener entre 4 y 6 dígitos');
      await expect(setupPin('1234567')).rejects.toThrow('El PIN debe tener entre 4 y 6 dígitos');
      await expect(setupPin('abcd')).rejects.toThrow('El PIN debe tener entre 4 y 6 dígitos');
    });

    it('sets up a PIN and checks isPinConfigured', async () => {
      expect(await isPinConfigured()).toBe(false);
      await setupPin('1234');
      expect(await isPinConfigured()).toBe(true);
    });

    it('verifies correct PIN successfully and resets attempt count', async () => {
      await setupPin('4321');

      const result = await verifyPin('4321');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const lockout = await getPinLockoutStatus();
      expect(lockout.isLockedOut).toBe(false);
      expect(lockout.failedAttempts).toBe(0);
    });

    it('rejects incorrect PIN and reports remaining attempts', async () => {
      await setupPin('9999');

      const result1 = await verifyPin('0000');
      expect(result1.success).toBe(false);
      expect(result1.isLockedOut).toBe(false);
      expect(result1.remainingAttempts).toBe(2);
      expect(result1.failedAttempts).toBe(1);

      const result2 = await verifyPin('1111');
      expect(result2.success).toBe(false);
      expect(result2.remainingAttempts).toBe(1);
      expect(result2.failedAttempts).toBe(2);
    });

    it('changes PIN successfully when current PIN is verified', async () => {
      await setupPin('1111');

      const failChange = await changePin('0000', '2222');
      expect(failChange.success).toBe(false);

      const successChange = await changePin('1111', '2222');
      expect(successChange.success).toBe(true);

      expect((await verifyPin('1111')).success).toBe(false);
      expect((await verifyPin('2222')).success).toBe(true);
    });
  });

  describe('Rate Limiting & Lockout Persistence', () => {
    it('triggers lockout after reaching threshold of failed attempts', async () => {
      await setupPin('5555');

      // Attempt 1
      await verifyPin('0001');
      // Attempt 2
      await verifyPin('0002');
      // Attempt 3 -> triggers first tier lockout (30s)
      const lockResult = await verifyPin('0003');

      expect(lockResult.success).toBe(false);
      expect(lockResult.isLockedOut).toBe(true);
      expect(lockResult.lockoutRemainingSeconds).toBeGreaterThanOrEqual(25);
      expect(lockResult.lockoutRemainingSeconds).toBeLessThanOrEqual(30);

      // Subsequent attempt while locked out is rejected immediately without checking PIN
      const immediateBlocked = await verifyPin('5555');
      expect(immediateBlocked.success).toBe(false);
      expect(immediateBlocked.isLockedOut).toBe(true);
      expect(immediateBlocked.error).toContain('Demasiados intentos fallidos');
    });

    it('returns error when verifying without configured PIN', async () => {
      const result = await verifyPin('1234');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No se ha configurado ningún PIN');
    });
  });

  describe('Biometrics Authentication', () => {
    it('reports unavailable when device lacks biometric hardware', async () => {
      mockHasHardwareAsync.mockResolvedValueOnce(false);

      const status = await getBiometricsStatus();
      expect(status.hasHardware).toBe(false);
      expect(status.available).toBe(false);
      expect(status.biometryType).toBe('NONE');
    });

    it('reports unavailable when hardware exists but biometrics is not enrolled', async () => {
      mockHasHardwareAsync.mockResolvedValueOnce(true);
      mockIsEnrolledAsync.mockResolvedValueOnce(false);
      mockSupportedTypesAsync.mockResolvedValueOnce([2]); // Facial recognition

      const status = await getBiometricsStatus();
      expect(status.hasHardware).toBe(true);
      expect(status.isEnrolled).toBe(false);
      expect(status.available).toBe(false);
      expect(status.biometryType).toBe('FACE');
    });

    it('reports available when enrolled with fingerprint hardware', async () => {
      mockHasHardwareAsync.mockResolvedValueOnce(true);
      mockIsEnrolledAsync.mockResolvedValueOnce(true);
      mockSupportedTypesAsync.mockResolvedValueOnce([1]); // Fingerprint

      const status = await getBiometricsStatus();
      expect(status.hasHardware).toBe(true);
      expect(status.isEnrolled).toBe(true);
      expect(status.available).toBe(true);
      expect(status.biometryType).toBe('FINGERPRINT');
    });

    it('denies access when biometrics is unavailable upon authenticate call', async () => {
      mockHasHardwareAsync.mockResolvedValueOnce(false);

      const result = await authenticateWithBiometrics();
      expect(result.success).toBe(false);
      expect(result.error).toContain('hardware biométrico');
    });

    it('grants access when biometric verification succeeds', async () => {
      mockHasHardwareAsync.mockResolvedValueOnce(true);
      mockIsEnrolledAsync.mockResolvedValueOnce(true);
      mockSupportedTypesAsync.mockResolvedValueOnce([2]);
      mockAuthenticateAsync.mockResolvedValueOnce({ success: true });

      const result = await authenticateWithBiometrics('Desbloquear billetera');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles user cancellation without throwing or granting access', async () => {
      mockHasHardwareAsync.mockResolvedValueOnce(true);
      mockIsEnrolledAsync.mockResolvedValueOnce(true);
      mockSupportedTypesAsync.mockResolvedValueOnce([2]);
      mockAuthenticateAsync.mockResolvedValueOnce({
        success: false,
        error: 'user_cancel',
      });

      const result = await authenticateWithBiometrics();
      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });

    it('handles verification failure without granting access', async () => {
      mockHasHardwareAsync.mockResolvedValueOnce(true);
      mockIsEnrolledAsync.mockResolvedValueOnce(true);
      mockSupportedTypesAsync.mockResolvedValueOnce([1]);
      mockAuthenticateAsync.mockResolvedValueOnce({
        success: false,
        error: 'not_recognized',
      });

      const result = await authenticateWithBiometrics();
      expect(result.success).toBe(false);
      expect(result.error).toContain('No se pudo verificar');
    });
  });

  describe('Constant-Time and PBKDF2 Primitives', () => {
    it('compares strings in constant time safely', () => {
      expect(constantTimeCompare('secret123', 'secret123')).toBe(true);
      expect(constantTimeCompare('secret123', 'secret124')).toBe(false);
      expect(constantTimeCompare('short', 'muchlongerstring')).toBe(false);
    });

    it('produces deterministic 32-byte hash for identical password and salt', () => {
      const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      const key1 = pbkdf2HmacSha256('1234', salt, 100);
      const key2 = pbkdf2HmacSha256('1234', salt, 100);
      const diffKey = pbkdf2HmacSha256('1235', salt, 100);

      expect(key1).toHaveLength(32);
      expect(key1).toEqual(key2);
      expect(key1).not.toEqual(diffKey);
    });
  });

  describe('SEC-001: PIN Length Tracking & Incomplete Input Safety', () => {
    it('returns null when no PIN is configured', async () => {
      expect(await getConfiguredPinLength()).toBeNull();
    });

    it('correctly tracks and returns configured PIN length for 4, 5, and 6 digits', async () => {
      await setupPin('1234');
      expect(await getConfiguredPinLength()).toBe(4);

      await setupPin('12345');
      expect(await getConfiguredPinLength()).toBe(5);

      await setupPin('123456');
      expect(await getConfiguredPinLength()).toBe(6);

      await removePinConfig();
      expect(await getConfiguredPinLength()).toBeNull();
    });

    it('does not penalize or increment failed attempts for incomplete or invalid length PIN inputs', async () => {
      await setupPin('54321');

      // Candidate PINs shorter than 4 or longer than 6 digits should fail validation without incrementing attempts
      const resultShort1 = await verifyPin('1');
      expect(resultShort1.success).toBe(false);
      expect(resultShort1.error).toContain('entre 4 y 6 dígitos');

      const resultShort2 = await verifyPin('123');
      expect(resultShort2.success).toBe(false);

      const resultLong = await verifyPin('1234567');
      expect(resultLong.success).toBe(false);

      const lockout = await getPinLockoutStatus();
      expect(lockout.failedAttempts).toBe(0);
      expect(lockout.isLockedOut).toBe(false);

      // Now verify that the actual valid 5-digit PIN works perfectly
      const validResult = await verifyPin('54321');
      expect(validResult.success).toBe(true);
    });

    it('successfully verifies 5 and 6 digit PINs', async () => {
      await setupPin('98765');
      expect((await verifyPin('98765')).success).toBe(true);

      await setupPin('123456');
      expect((await verifyPin('123456')).success).toBe(true);
      expect((await verifyPin('654321')).success).toBe(false);
    });
  });

  describe('SEC-003: Biometric PIN Recovery', () => {
    it('rejects invalid PIN format during recovery without prompting biometrics', async () => {
      const resShort = await recoverPinWithBiometrics('12');
      expect(resShort.success).toBe(false);
      expect(resShort.error).toContain('entre 4 y 6 dígitos');
      expect(mockAuthenticateAsync).not.toHaveBeenCalled();
    });

    it('fails closed when biometrics hardware or enrollment is not available', async () => {
      mockHasHardwareAsync.mockResolvedValueOnce(false);
      mockIsEnrolledAsync.mockResolvedValueOnce(false);

      const res = await recoverPinWithBiometrics('1234');
      expect(res.success).toBe(false);
      expect(res.error).toContain('hardware biométrico');
    });

    it('fails closed when biometric verification is cancelled by user', async () => {
      await setupPin('1111');

      mockHasHardwareAsync.mockResolvedValueOnce(true);
      mockIsEnrolledAsync.mockResolvedValueOnce(true);
      mockSupportedTypesAsync.mockResolvedValueOnce([1]);
      mockAuthenticateAsync.mockResolvedValueOnce({
        success: false,
        error: 'user_cancel',
      });

      const res = await recoverPinWithBiometrics('2222');
      expect(res.success).toBe(false);
      expect(res.error).toContain('cancelada');

      // Previous PIN must remain active and unchanged!
      expect((await verifyPin('1111')).success).toBe(true);
      expect((await verifyPin('2222')).success).toBe(false);
    });

    it('successfully recovers and updates PIN when biometric check passes', async () => {
      await setupPin('1111');
      expect(await getConfiguredPinLength()).toBe(4);

      mockHasHardwareAsync.mockResolvedValueOnce(true);
      mockIsEnrolledAsync.mockResolvedValueOnce(true);
      mockSupportedTypesAsync.mockResolvedValueOnce([1]);
      mockAuthenticateAsync.mockResolvedValueOnce({ success: true });

      const res = await recoverPinWithBiometrics('654321');
      expect(res.success).toBe(true);
      expect(await getConfiguredPinLength()).toBe(6);

      // Old PIN is no longer valid; new 6-digit PIN works!
      expect((await verifyPin('1111')).success).toBe(false);
      expect((await verifyPin('654321')).success).toBe(true);
    });

    it('supports two-step recovery flow with verifyBiometricForRecovery', async () => {
      await setupPin('4444');

      // Step 1: Pre-authorization via biometrics
      mockHasHardwareAsync.mockResolvedValueOnce(true);
      mockIsEnrolledAsync.mockResolvedValueOnce(true);
      mockSupportedTypesAsync.mockResolvedValueOnce([2]);
      mockAuthenticateAsync.mockResolvedValueOnce({ success: true });

      const verifyRes = await verifyBiometricForRecovery();
      expect(verifyRes.success).toBe(true);

      // Step 2: Apply new PIN without re-prompting biometrics
      const recoverRes = await recoverPinWithBiometrics('55555');
      expect(recoverRes.success).toBe(true);
      expect(await getConfiguredPinLength()).toBe(5);

      expect((await verifyPin('55555')).success).toBe(true);
      expect((await verifyPin('4444')).success).toBe(false);
    });
  });
});

