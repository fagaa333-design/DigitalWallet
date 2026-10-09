jest.mock('expo-secure-store', () => jest.requireActual('./mocks/secure-store').secureStoreMock);
jest.mock('expo-file-system', () => jest.requireActual('./mocks/file-system'));

import { AESEncryptionKey } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import {
  hasMasterKey,
  initializeWalletKeys,
  withDatabaseKey,
  withFileEncryptionKey,
} from '@/shared/security/key-manager';
import { deleteWalletFile, readWalletFile, storeWalletFile } from '@/shared/storage/wallet-files';
import { fileSystemMock } from './mocks/file-system';
import { secureStoreMock } from './mocks/secure-store';

beforeEach(() => {
  secureStoreMock.reset();
  fileSystemMock.reset();
  jest.restoreAllMocks();
});

describe('wallet key management', () => {
  it('creates keys once, reuses them, and can report absence without creating one', async () => {
    expect(await hasMasterKey()).toBe(false);

    const generate = jest.spyOn(AESEncryptionKey, 'generate');
    await initializeWalletKeys();
    const firstCount = generate.mock.calls.length;

    await initializeWalletKeys();
    let databaseKeySize = 0;
    let databaseKey = '';
    let filesKey = '';
    await withDatabaseKey(async (key) => {
      databaseKeySize = key.size;
      databaseKey = await key.encoded('hex');
    });
    await withFileEncryptionKey(async (key) => {
      filesKey = await key.encoded('hex');
    });

    expect(firstCount).toBe(3);
    expect(generate).toHaveBeenCalledTimes(firstCount);
    expect(databaseKeySize).toBe(256);
    expect(databaseKey === filesKey).toBe(false);
    expect(await hasMasterKey()).toBe(true);
  });

  it('refuses to replace a missing key after initialization', async () => {
    const generate = jest.spyOn(AESEncryptionKey, 'generate');
    await initializeWalletKeys();
    const firstCount = generate.mock.calls.length;
    secureStoreMock.values.delete('wallet.master-key.v1');

    await expect(initializeWalletKeys()).rejects.toThrow(
      'The wallet master key is missing. Refusing to generate a replacement.',
    );

    expect(generate).toHaveBeenCalledTimes(firstCount);
    expect(await hasMasterKey()).toBe(false);
  });

  it('does not log key material', async () => {
    const spies = [
      jest.spyOn(console, 'log').mockImplementation(() => undefined),
      jest.spyOn(console, 'debug').mockImplementation(() => undefined),
      jest.spyOn(console, 'info').mockImplementation(() => undefined),
      jest.spyOn(console, 'warn').mockImplementation(() => undefined),
      jest.spyOn(console, 'error').mockImplementation(() => undefined),
    ];

    await initializeWalletKeys();
    await withDatabaseKey(async (key) => {
      await key.encoded('hex');
    });

    expect(spies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
  });
});

describe('encrypted wallet files', () => {
  it('round-trips content, stores only ciphertext, and deletes the encrypted file', async () => {
    await initializeWalletKeys();
    const plaintext = new TextEncoder().encode('private wallet document payload');
    const fileId = await storeWalletFile(plaintext);
    const encryptedFile = new File(
      new Directory(Paths.document, 'wallet-items-encrypted'),
      `${fileId}.dwf`,
    );
    const encryptedBytes = await encryptedFile.bytes();
    const recovered = await readWalletFile(fileId);
    const plaintextIsStored = Array.from(fileSystemMock.files.values()).some((bytes) =>
      containsSequence(bytes, plaintext),
    );

    expect(plaintextIsStored).toBe(false);
    expect(bytesEqual(recovered, plaintext)).toBe(true);
    expect(encryptedBytes.slice(0, 4)).toEqual(new Uint8Array([0x44, 0x57, 0x46, 0x01]));

    deleteWalletFile(fileId);
    expect(encryptedFile.exists).toBe(false);
  });

  it('rejects authenticated data after ciphertext tampering', async () => {
    await initializeWalletKeys();
    const fileId = await storeWalletFile(new TextEncoder().encode('tamper test payload'));
    const encryptedFile = new File(
      new Directory(Paths.document, 'wallet-items-encrypted'),
      `${fileId}.dwf`,
    );
    const stored = await encryptedFile.bytes();
    stored[4 + 12] ^= 0x01;
    encryptedFile.write(stored);

    await expect(readWalletFile(fileId)).rejects.toThrow();
  });

  it('refuses to reuse or overwrite legacy plaintext wallet files', async () => {
    const legacyUri = 'file:///wallet-document/wallet-items/legacy.png';
    fileSystemMock.directories.add('file:///wallet-document/wallet-items');
    fileSystemMock.files.set(legacyUri, new Uint8Array([1, 2, 3]));

    await expect(storeWalletFile(new Uint8Array([4, 5, 6]))).rejects.toThrow(
      'Unencrypted legacy wallet files were found.',
    );

    expect(fileSystemMock.files.has(legacyUri)).toBe(true);
    expect(fileSystemMock.files.size).toBe(1);
  });

  it('uses a fresh GCM nonce for each encryption operation', async () => {
    await initializeWalletKeys();
    const plaintext = new TextEncoder().encode('same payload');
    const firstId = await storeWalletFile(plaintext);
    const secondId = await storeWalletFile(plaintext);
    const directory = new Directory(Paths.document, 'wallet-items-encrypted');
    const first = await new File(directory, `${firstId}.dwf`).bytes();
    const second = await new File(directory, `${secondId}.dwf`).bytes();

    expect(bytesEqual(first.slice(4, 16), second.slice(4, 16))).toBe(false);
  });
});

function containsSequence(haystack: Uint8Array, needle: Uint8Array): boolean {
  return haystack.some((_, start) =>
    needle.every((byte, offset) => haystack[start + offset] === byte),
  );
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}
