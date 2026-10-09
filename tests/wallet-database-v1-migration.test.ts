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
  sqliteMock.reset(1, true);
  await initializeWalletKeys();
});

it('upgrades the existing schema version without recreating the wallet table', async () => {
  await getWalletDatabase();

  const migrationSql = sqliteMock.transaction.execAsync.mock.calls
    .map(([sql]) => sql)
    .join('\n');
  expect(migrationSql).toContain('ALTER TABLE wallet_items RENAME COLUMN image_uri TO image_id');
  expect(migrationSql).not.toContain('CREATE TABLE wallet_items');
  expect(sqliteMock.state.schemaVersion).toBe(2);
  expect(sqliteMock.database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
});
