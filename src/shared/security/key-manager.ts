import {
  AESEncryptionKey,
  AESSealedData,
  AESKeySize,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';
import { getSecret, setSecret } from './secret-store';

const MASTER_KEY_STORAGE_KEY = 'wallet.master-key.v1';
const MASTER_KEY_INITIALIZED_KEY = 'wallet.master-key.initialized.v1';
const MASTER_KEY_RECORD_PREFIX = 'v1:';
const PURPOSE_KEY_PREFIX = 'wallet.data-key.v1.';
const PURPOSE_KEY_INITIALIZED_PREFIX = 'wallet.data-key.initialized.v1.';
const PURPOSE_KEY_AAD_PREFIX = 'digital-wallet/data-key/v1/';
const INITIALIZED_VALUE = '1';

let initializationPromise: Promise<void> | undefined;

function purposeKeyStorageKey(purpose: 'database' | 'files'): string {
  return `${PURPOSE_KEY_PREFIX}${purpose}`;
}

function purposeMarkerKey(purpose: 'database' | 'files'): string {
  return `${PURPOSE_KEY_INITIALIZED_PREFIX}${purpose}`;
}

function purposeAssociatedData(purpose: 'database' | 'files'): Uint8Array {
  return Uint8Array.from(`${PURPOSE_KEY_AAD_PREFIX}${purpose}`, (character) =>
    character.charCodeAt(0),
  );
}

async function readMasterKey(): Promise<AESEncryptionKey | null> {
  const storedRecord = await getSecret(MASTER_KEY_STORAGE_KEY);
  if (storedRecord === null) {
    return null;
  }
  if (!storedRecord.startsWith(MASTER_KEY_RECORD_PREFIX)) {
    throw new Error('The stored wallet master key has an unsupported format.');
  }

  const key = await AESEncryptionKey.import(
    storedRecord.slice(MASTER_KEY_RECORD_PREFIX.length),
    'hex',
  );
  if (key.size !== AESKeySize.AES256) {
    throw new Error('The stored wallet master key is not 256 bits.');
  }
  return key;
}

async function requireMasterKey(): Promise<AESEncryptionKey> {
  const key = await readMasterKey();
  if (key === null) {
    throw new Error('Wallet security has not been initialized.');
  }
  return key;
}

async function loadPurposeKey(
  purpose: 'database' | 'files',
): Promise<AESEncryptionKey | null> {
  const storedEnvelope = await getSecret(purposeKeyStorageKey(purpose));
  if (storedEnvelope === null) {
    return null;
  }

  const masterKey = await requireMasterKey();
  const sealedData = AESSealedData.fromCombined(storedEnvelope, {
    ivLength: 12,
    tagLength: 16,
  });
  const keyBytes = await aesDecryptAsync(sealedData, masterKey, {
    output: 'bytes',
    additionalData: purposeAssociatedData(purpose),
  });

  try {
    const key = await AESEncryptionKey.import(keyBytes);
    if (key.size !== AESKeySize.AES256) {
      throw new Error(`The wallet ${purpose} key is not 256 bits.`);
    }
    return key;
  } finally {
    keyBytes.fill(0);
  }
}

async function ensurePurposeKey(
  purpose: 'database' | 'files',
  masterKey: AESEncryptionKey,
): Promise<void> {
  const existing = await loadPurposeKey(purpose);
  if (existing !== null) {
    if ((await getSecret(purposeMarkerKey(purpose))) === null) {
      await setSecret(purposeMarkerKey(purpose), INITIALIZED_VALUE);
    }
    return;
  }

  if ((await getSecret(purposeMarkerKey(purpose))) !== null) {
    throw new Error(
      `The wallet ${purpose} key is missing. Refusing to generate a replacement.`,
    );
  }

  const candidate = await AESEncryptionKey.generate(AESKeySize.AES256);
  const keyBytes = await candidate.bytes();
  try {
    const sealedData = await aesEncryptAsync(keyBytes, masterKey, {
      additionalData: purposeAssociatedData(purpose),
    });
    const wrappedKey = await sealedData.combined('base64');
    await setSecret(purposeKeyStorageKey(purpose), wrappedKey);
    await setSecret(purposeMarkerKey(purpose), INITIALIZED_VALUE);
  } finally {
    keyBytes.fill(0);
  }
}

async function initializeWalletKeysOnce(): Promise<void> {
  let masterKey = await readMasterKey();
  if (masterKey === null) {
    if ((await getSecret(MASTER_KEY_INITIALIZED_KEY)) !== null) {
      throw new Error('The wallet master key is missing. Refusing to generate a replacement.');
    }

    masterKey = await AESEncryptionKey.generate(AESKeySize.AES256);
    const encodedKey = await masterKey.encoded('hex');
    await setSecret(MASTER_KEY_STORAGE_KEY, `${MASTER_KEY_RECORD_PREFIX}${encodedKey}`);
    await setSecret(MASTER_KEY_INITIALIZED_KEY, INITIALIZED_VALUE);
  } else if ((await getSecret(MASTER_KEY_INITIALIZED_KEY)) === null) {
    await setSecret(MASTER_KEY_INITIALIZED_KEY, INITIALIZED_VALUE);
  }

  await ensurePurposeKey('database', masterKey);
  await ensurePurposeKey('files', masterKey);
}

export function initializeWalletKeys(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeWalletKeysOnce().finally(() => {
      initializationPromise = undefined;
    });
  }
  return initializationPromise;
}

export async function hasMasterKey(): Promise<boolean> {
  return (await readMasterKey()) !== null;
}

async function withPurposeKey<T>(
  purpose: 'database' | 'files',
  operation: (key: AESEncryptionKey) => Promise<T>,
): Promise<T> {
  const key = await loadPurposeKey(purpose);
  if (key === null) {
    throw new Error(`Wallet ${purpose} encryption key is unavailable.`);
  }
  return operation(key);
}

export function withDatabaseKey<T>(
  operation: (key: AESEncryptionKey) => Promise<T>,
): Promise<T> {
  return withPurposeKey('database', operation);
}

export function withFileEncryptionKey<T>(
  operation: (key: AESEncryptionKey) => Promise<T>,
): Promise<T> {
  return withPurposeKey('files', operation);
}
