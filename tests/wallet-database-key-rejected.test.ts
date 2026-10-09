jest.mock('expo-secure-store', () => jest.requireActual('./mocks/secure-store').secureStoreMock);
jest.mock('expo-file-system', () => jest.requireActual('./mocks/file-system'));
jest.mock('expo-sqlite', () => jest.requireActual('./mocks/expo-sqlite'));

import { getWalletDatabase } from '@/features/wallet/data/wallet-database';
import { initializeWalletKeys } from '@/shared/security/key-manager';
import { fileSystemMock } from './mocks/file-system';
import { secureStoreMock } from './mocks/secure-store';
import { sqliteMock } from './mocks/expo-sqlite';

beforeEach(async () => {
  secureStoreMock.reset();
  fileSystemMock.reset();
  sqliteMock.reset(1, true, false);
  await initializeWalletKeys();
});

it('rejects a database whose schema cannot be authenticated and does not migrate it', async () => {
  await expect(getWalletDatabase()).rejects.toThrow(
    'Encrypted database could not be opened.',
  );

  expect(sqliteMock.database.withExclusiveTransactionAsync).not.toHaveBeenCalled();
  expect(sqliteMock.database.closeAsync).toHaveBeenCalledTimes(1);
});
