import {
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  randomUUID,
} from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { withFileEncryptionKey } from '@/shared/security/key-manager';

const ENCRYPTED_FILES_DIRECTORY = 'wallet-items-encrypted';
const LEGACY_FILES_DIRECTORY = 'wallet-items';
const ENVELOPE_HEADER = new Uint8Array([0x44, 0x57, 0x46, 0x01]);
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;
const FILE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function encryptedDirectory(): Directory {
  return new Directory(Paths.document, ENCRYPTED_FILES_DIRECTORY);
}

function assertValidFileId(fileId: string): void {
  if (!FILE_ID_PATTERN.test(fileId)) {
    throw new Error('Invalid wallet file identifier.');
  }
}

function associatedData(fileId: string): Uint8Array {
  const idBytes = Uint8Array.from(fileId, (character) => character.charCodeAt(0));
  const data = new Uint8Array(ENVELOPE_HEADER.length + idBytes.length);
  data.set(ENVELOPE_HEADER);
  data.set(idBytes, ENVELOPE_HEADER.length);
  return data;
}

function hasFiles(directory: Directory): boolean {
  return directory.exists && directory.list().length > 0;
}

export function assertNoLegacyWalletFiles(): void {
  if (hasFiles(new Directory(Paths.document, LEGACY_FILES_DIRECTORY))) {
    throw new Error(
      'Unencrypted legacy wallet files were found. An explicit migration is required before using wallet storage.',
    );
  }
}

export function hasEncryptedWalletFiles(): boolean {
  return hasFiles(encryptedDirectory());
}

export async function storeWalletFile(plaintextBytes: Uint8Array): Promise<string> {
  assertNoLegacyWalletFiles();

  const fileId = randomUUID();
  const temporaryPlaintext = plaintextBytes.slice();
  let envelope: Uint8Array | undefined;

  try {
    envelope = await withFileEncryptionKey(async (key) => {
      const sealedData = await aesEncryptAsync(temporaryPlaintext, key, {
        additionalData: associatedData(fileId),
      });
      const combined = await sealedData.combined('bytes');
      const fileEnvelope = new Uint8Array(ENVELOPE_HEADER.length + combined.length);
      fileEnvelope.set(ENVELOPE_HEADER);
      fileEnvelope.set(combined, ENVELOPE_HEADER.length);
      return fileEnvelope;
    });

    const directory = encryptedDirectory();
    directory.create({ idempotent: true, intermediates: true });
    const file = new File(directory, `${fileId}.dwf`);
    file.create();
    file.write(envelope);
    return fileId;
  } finally {
    temporaryPlaintext.fill(0);
    envelope?.fill(0);
  }
}

export async function readWalletFile(fileId: string): Promise<Uint8Array> {
  assertValidFileId(fileId);

  const file = new File(encryptedDirectory(), `${fileId}.dwf`);
  if (!file.exists) {
    throw new Error('Encrypted wallet file was not found.');
  }

  const storedBytes = await file.bytes();
  if (
    storedBytes.length < ENVELOPE_HEADER.length + GCM_IV_LENGTH + GCM_TAG_LENGTH ||
    !ENVELOPE_HEADER.every((byte, index) => storedBytes[index] === byte)
  ) {
    throw new Error('Encrypted wallet file has an unsupported or corrupt format.');
  }

  const sealedData = AESSealedData.fromCombined(
    storedBytes.subarray(ENVELOPE_HEADER.length),
    { ivLength: GCM_IV_LENGTH, tagLength: GCM_TAG_LENGTH },
  );

  return withFileEncryptionKey((key) =>
    aesDecryptAsync(sealedData, key, {
      output: 'bytes',
      additionalData: associatedData(fileId),
    }),
  );
}

export function deleteWalletFile(fileId: string): void {
  assertValidFileId(fileId);

  const file = new File(encryptedDirectory(), `${fileId}.dwf`);
  if (file.exists) {
    file.delete();
  }
}
