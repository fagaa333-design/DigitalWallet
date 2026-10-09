jest.mock('expo-secure-store', () => jest.requireActual('./mocks/secure-store').secureStoreMock);
jest.mock('expo-file-system', () => jest.requireActual('./mocks/file-system'));
jest.mock('expo-sqlite', () => jest.requireActual('./mocks/expo-sqlite'));

import { initializeWalletKeys } from '@/shared/security/key-manager';
import { getWalletDatabase } from '@/features/wallet/data/wallet-database';
import { fileSystemMock } from './mocks/file-system';
import { secureStoreMock } from './mocks/secure-store';
import { sqliteMock } from './mocks/expo-sqlite';

beforeEach(async () => {
  secureStoreMock.reset();
  fileSystemMock.reset();
  sqliteMock.reset(0, false);
  await initializeWalletKeys();
});

it('fails closed without SQLCipher and does not run schema migrations', async () => {
  await expect(getWalletDatabase()).rejects.toThrow('SQLCipher is unavailable');

  expect(sqliteMock.database.withExclusiveTransactionAsync).not.toHaveBeenCalled();
  expect(sqliteMock.database.closeAsync).toHaveBeenCalledTimes(1);
});
