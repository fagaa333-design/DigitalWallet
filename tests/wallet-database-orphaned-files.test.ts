jest.mock('expo-secure-store', () => jest.requireActual('./mocks/secure-store').secureStoreMock);
jest.mock('expo-file-system', () => jest.requireActual('./mocks/file-system'));
jest.mock('expo-sqlite', () => jest.requireActual('./mocks/expo-sqlite'));

import { getWalletDatabase } from '@/features/wallet/data/wallet-database';
import { fileSystemMock, Directory, File, Paths } from './mocks/file-system';
import { secureStoreMock } from './mocks/secure-store';
import { sqliteMock } from './mocks/expo-sqlite';

beforeEach(() => {
  secureStoreMock.reset();
  fileSystemMock.reset();
  sqliteMock.reset(0, true);
});

it('refuses to initialize when encrypted files exist but their master key is missing', async () => {
  const encDir = new Directory(Paths.document, 'wallet-items-encrypted');
  encDir.create({ idempotent: true, intermediates: true });
  const dummyFile = new File(encDir, 'existing-file.dwf');
  dummyFile.create();
  dummyFile.write(new Uint8Array([1, 2, 3]));

  await expect(getWalletDatabase()).rejects.toThrow(
    'Encrypted wallet files exist but their key is unavailable.',
  );
  expect(sqliteMock.openDatabaseAsync).not.toHaveBeenCalled();
});
