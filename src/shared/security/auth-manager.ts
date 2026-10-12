import * as LocalAuthentication from 'expo-local-authentication';
import { getSecret, setSecret, removeSecret } from './secret-store';

// Storage keys in SecureStore
const PIN_HASH_KEY = 'wallet.auth.pin_hash.v1';
const PIN_SALT_KEY = 'wallet.auth.pin_salt.v1';
const PIN_ATTEMPTS_KEY = 'wallet.auth.pin_attempts.v1';
const PIN_LOCKOUT_KEY = 'wallet.auth.pin_lockout_until.v1';

// PBKDF2 Configuration
const PBKDF2_ITERATIONS = 25000;
const SALT_BYTE_LENGTH = 16;
const MAX_UNLOCKED_ATTEMPTS = 3;

// Lockout durations in milliseconds
const LOCKOUT_TIERS_MS: Record<number, number> = {
  3: 30 * 1000, // 30 seconds
  4: 60 * 1000, // 1 minute
  5: 5 * 60 * 1000, // 5 minutes
};
const DEFAULT_EXTENDED_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes for 6+ attempts

export type BiometryType = 'FACE' | 'FINGERPRINT' | 'IRIS' | 'NONE';

export interface BiometricsStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometryType: BiometryType;
  available: boolean;
}

export interface PinLockoutStatus {
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  failedAttempts: number;
}

export interface VerifyPinResult {
  success: boolean;
  error?: string;
  isLockedOut?: boolean;
  lockoutRemainingSeconds?: number;
  remainingAttempts?: number;
  failedAttempts?: number;
}

/* =========================================================================
   Pure TypeScript SHA-256 and HMAC-SHA256 for deterministic PBKDF2
   Compliant with RFC 2898 / RFC 8018 without external dependencies.
   ========================================================================= */

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Transform(w: number[], h: number[]): void {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let i = 16; i < 64; i++) {
    const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
    const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
  }

  let [a, b, c, d, e, f, g, h0] = h;

  for (let i = 0; i < 64; i++) {
    const s1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
    const ch = (e & f) ^ (~e & g);
    const temp1 = (h0 + s1 + ch + K[i] + w[i]) | 0;
    const s0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
    const maj = (a & b) ^ (a & c) ^ (b & c);
    const temp2 = (s0 + maj) | 0;

    h0 = g;
    g = f;
    f = e;
    e = (d + temp1) | 0;
    d = c;
    c = b;
    b = a;
    a = (temp1 + temp2) | 0;
  }

  h[0] = (h[0] + a) | 0;
  h[1] = (h[1] + b) | 0;
  h[2] = (h[2] + c) | 0;
  h[3] = (h[3] + d) | 0;
  h[4] = (h[4] + e) | 0;
  h[5] = (h[5] + f) | 0;
  h[6] = (h[6] + g) | 0;
  h[7] = (h[7] + h0) | 0;
}

function sha256(data: Uint8Array): Uint8Array {
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const len = data.length;
  const bitLen = len * 8;
  const padLen = (len % 64 < 56) ? (56 - (len % 64)) : (120 - (len % 64));
  const totalLen = len + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(data);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 4, bitLen >>> 0);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000));

  const w = new Array(64);
  for (let i = 0; i < totalLen; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4);
    }
    sha256Transform(w, h);
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, h[i]);
  }
  return out;
}

function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  let keyBlock = new Uint8Array(64);
  if (key.length > 64) {
    keyBlock.set(sha256(key));
  } else {
    keyBlock.set(key);
  }

  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = keyBlock[i] ^ 0x5c;
    iKeyPad[i] = keyBlock[i] ^ 0x36;
  }

  const inner = new Uint8Array(64 + message.length);
  inner.set(iKeyPad);
  inner.set(message, 64);
  const innerHash = sha256(inner);

  const outer = new Uint8Array(64 + 32);
  outer.set(oKeyPad);
  outer.set(innerHash, 64);
  return sha256(outer);
}

/**
 * PBKDF2-HMAC-SHA256 (RFC 2898 / RFC 8018 Section 5.2).
 * Produces a 256-bit (32-byte) stretched key.
 */
export function pbkdf2HmacSha256(
  password: string,
  saltBytes: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Uint8Array {
  const passBytes = new TextEncoder().encode(password);

  // U1 = HMAC(Pass, Salt || 0x00000001)
  const saltBlock = new Uint8Array(saltBytes.length + 4);
  saltBlock.set(saltBytes);
  saltBlock[saltBytes.length + 3] = 1;

  let u = hmacSha256(passBytes, saltBlock);
  const t = new Uint8Array(u);

  for (let i = 1; i < iterations; i++) {
    u = hmacSha256(passBytes, u);
    for (let k = 0; k < 32; k++) {
      t[k] ^= u[k];
    }
  }

  return t;
}

/**
 * Constant-time string equality comparison to prevent timing attacks.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function generateSecureSalt(length: number = SALT_BYTE_LENGTH): Uint8Array {
  const salt = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(salt);
  } else {
    // Math.random fallback (e.g. lightweight node mock if crypto not polyfilled)
    for (let i = 0; i < length; i++) {
      salt[i] = Math.floor(Math.random() * 256);
    }
  }
  return salt;
}

/* =========================================================================
   Biometrics Authentication
   ========================================================================= */

export async function getBiometricsStatus(): Promise<BiometricsStatus> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return {
        hasHardware: false,
        isEnrolled: false,
        biometryType: 'NONE',
        available: false,
      };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometryType: BiometryType = 'NONE';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometryType = 'FACE';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometryType = 'FINGERPRINT';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometryType = 'IRIS';
    }

    return {
      hasHardware,
      isEnrolled,
      biometryType,
      available: hasHardware && isEnrolled,
    };
  } catch {
    return {
      hasHardware: false,
      isEnrolled: false,
      biometryType: 'NONE',
      available: false,
    };
  }
}

export async function authenticateWithBiometrics(
  promptMessage: string = 'Verifica tu identidad para desbloquear tu billetera',
): Promise<{ success: boolean; error?: string; cancelled?: boolean }> {
  try {
    const status = await getBiometricsStatus();
    if (!status.available) {
      return {
        success: false,
        error: status.hasHardware
          ? 'La biometría no está configurada en este dispositivo.'
          : 'El dispositivo no cuenta con hardware biométrico disponible.',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true,
    });

    if (result.success) {
      return { success: true };
    }

    if (result.error === 'user_cancel' || result.error === 'system_cancel') {
      return {
        success: false,
        cancelled: true,
        error: 'Autenticación cancelada.',
      };
    }

    return {
      success: false,
      error: 'No se pudo verificar la identidad biométrica.',
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error al solicitar autenticación biométrica.';
    return {
      success: false,
      error: message,
    };
  }
}

/* =========================================================================
   Secure PIN Management & Verification
   ========================================================================= */

export async function isPinConfigured(): Promise<boolean> {
  const hash = await getSecret(PIN_HASH_KEY);
  return hash !== null && hash.length > 0;
}

export async function getPinLockoutStatus(): Promise<PinLockoutStatus> {
  const lockoutUntilStr = await getSecret(PIN_LOCKOUT_KEY);
  const attemptsStr = await getSecret(PIN_ATTEMPTS_KEY);
  const failedAttempts = attemptsStr ? parseInt(attemptsStr, 10) || 0 : 0;

  if (lockoutUntilStr) {
    const lockoutUntil = parseInt(lockoutUntilStr, 10) || 0;
    const now = Date.now();
    if (lockoutUntil > now) {
      const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return {
        isLockedOut: true,
        lockoutRemainingSeconds: remainingSeconds,
        failedAttempts,
      };
    } else {
      // Lockout expired: remove the lockout marker, keep attempts or handle gracefully
      await removeSecret(PIN_LOCKOUT_KEY);
    }
  }

  return {
    isLockedOut: false,
    lockoutRemainingSeconds: 0,
    failedAttempts,
  };
}

export async function setupPin(pin: string): Promise<void> {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('El PIN debe tener entre 4 y 6 dígitos numéricos.');
  }

  const saltBytes = generateSecureSalt();
  const derivedKey = pbkdf2HmacSha256(pin, saltBytes);

  const saltHex = bytesToHex(saltBytes);
  const hashHex = bytesToHex(derivedKey);

  await setSecret(PIN_SALT_KEY, saltHex);
  await setSecret(PIN_HASH_KEY, hashHex);
  await removeSecret(PIN_ATTEMPTS_KEY);
  await removeSecret(PIN_LOCKOUT_KEY);
}

export async function verifyPin(candidatePin: string): Promise<VerifyPinResult> {
  // Check lockout status
  const lockoutStatus = await getPinLockoutStatus();
  if (lockoutStatus.isLockedOut) {
    return {
      success: false,
      isLockedOut: true,
      lockoutRemainingSeconds: lockoutStatus.lockoutRemainingSeconds,
      error: `Demasiados intentos fallidos. Inténtalo de nuevo en ${lockoutStatus.lockoutRemainingSeconds} segundos.`,
    };
  }

  const storedHash = await getSecret(PIN_HASH_KEY);
  const storedSalt = await getSecret(PIN_SALT_KEY);

  if (!storedHash || !storedSalt) {
    return {
      success: false,
      error: 'No se ha configurado ningún PIN en la billetera.',
    };
  }

  const saltBytes = hexToBytes(storedSalt);
  const candidateDerivedKey = pbkdf2HmacSha256(candidatePin, saltBytes);
  const candidateHashHex = bytesToHex(candidateDerivedKey);

  const isMatch = constantTimeCompare(candidateHashHex, storedHash);

  if (isMatch) {
    // Reset attempt counters upon successful verification
    await removeSecret(PIN_ATTEMPTS_KEY);
    await removeSecret(PIN_LOCKOUT_KEY);
    return { success: true };
  }

  // Failed attempt handling
  const newFailedAttempts = lockoutStatus.failedAttempts + 1;
  await setSecret(PIN_ATTEMPTS_KEY, String(newFailedAttempts));

  if (newFailedAttempts >= MAX_UNLOCKED_ATTEMPTS) {
    const delayMs = LOCKOUT_TIERS_MS[newFailedAttempts] ?? DEFAULT_EXTENDED_LOCKOUT_MS;
    const lockoutUntil = Date.now() + delayMs;
    await setSecret(PIN_LOCKOUT_KEY, String(lockoutUntil));
    const lockoutSeconds = Math.ceil(delayMs / 1000);

    return {
      success: false,
      isLockedOut: true,
      lockoutRemainingSeconds: lockoutSeconds,
      failedAttempts: newFailedAttempts,
      error: `Has superado los intentos permitidos. Bloqueado por ${lockoutSeconds} segundos.`,
    };
  }

  const remaining = MAX_UNLOCKED_ATTEMPTS - newFailedAttempts;
  return {
    success: false,
    isLockedOut: false,
    remainingAttempts: remaining,
    failedAttempts: newFailedAttempts,
    error: `PIN incorrecto. Te quedan ${remaining} ${remaining === 1 ? 'intento' : 'intentos'} antes del bloqueo temporal.`,
  };
}

export async function changePin(currentPin: string, newPin: string): Promise<VerifyPinResult> {
  const verifyResult = await verifyPin(currentPin);
  if (!verifyResult.success) {
    return verifyResult;
  }

  await setupPin(newPin);
  return { success: true };
}

export async function removePinConfig(): Promise<void> {
  await removeSecret(PIN_HASH_KEY);
  await removeSecret(PIN_SALT_KEY);
  await removeSecret(PIN_ATTEMPTS_KEY);
  await removeSecret(PIN_LOCKOUT_KEY);
}
