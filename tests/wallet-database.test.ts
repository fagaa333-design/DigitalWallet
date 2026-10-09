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
  sqliteMock.reset(0, true);
  await initializeWalletKeys();
});

it('keys the database before queries and runs the versioned migrations once', async () => {
  const database = await getWalletDatabase();
  const secondConnection = await getWalletDatabase();
  const keyEvent = sqliteMock.state.events.findIndex((event) => event.includes('PRAGMA key'));
  const cipherCheckEvent = sqliteMock.state.events.findIndex((event) =>
    event.includes('PRAGMA cipher_version'),
  );
  const schemaQueryEvent = sqliteMock.state.events.findIndex((event) =>
    event.includes('PRAGMA user_version'),
  );
  const migrationSql = sqliteMock.transaction.execAsync.mock.calls
    .map(([sql]) => sql)
    .join('\n');

  expect(database).toBe(secondConnection);
  expect(keyEvent).toBeGreaterThanOrEqual(0);
  expect(cipherCheckEvent).toBeGreaterThan(keyEvent);
  expect(schemaQueryEvent).toBeGreaterThan(cipherCheckEvent);
  expect(migrationSql).toContain('CREATE TABLE wallet_items');
  expect(migrationSql).toContain('ALTER TABLE wallet_items RENAME COLUMN image_uri TO image_id');
  expect(sqliteMock.state.schemaVersion).toBe(2);
  expect(sqliteMock.database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(2);
});
