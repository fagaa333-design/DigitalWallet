jest.mock('expo-secure-store', () => jest.requireActual('./mocks/secure-store').secureStoreMock);
jest.mock('expo-file-system', () => jest.requireActual('./mocks/file-system'));
jest.mock('expo-sqlite', () => jest.requireActual('./mocks/expo-sqlite'));

import { getWalletDatabase } from '@/features/wallet/data/wallet-database';
import { fileSystemMock } from './mocks/file-system';
import { sqliteMock } from './mocks/expo-sqlite';

beforeEach(() => {
  fileSystemMock.reset();
  sqliteMock.reset(0, true);
});

it('refuses an unencrypted legacy database without opening or deleting it', async () => {
  const legacyUri = 'file:///wallet-document/SQLite/digital-wallet.db';
  fileSystemMock.files.set(legacyUri, new Uint8Array([0x53, 0x51, 0x4c]));

  await expect(getWalletDatabase()).rejects.toThrow(
    'An unencrypted legacy wallet database was found.',
  );

  expect(sqliteMock.openDatabaseAsync).not.toHaveBeenCalled();
  expect(fileSystemMock.files.has(legacyUri)).toBe(true);
});
