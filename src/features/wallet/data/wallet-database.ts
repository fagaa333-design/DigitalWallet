import { File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import {
  hasMasterKey,
  initializeWalletKeys,
  withDatabaseKey,
} from '@/shared/security/key-manager';
import { assertNoLegacyWalletFiles, hasEncryptedWalletFiles } from '@/shared/storage/wallet-files';

const DATABASE_NAME = 'digital-wallet.sqlcipher.db';
const LEGACY_DATABASE_NAME = 'digital-wallet.db';
const DATABASE_SCHEMA_VERSION = 2;

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function applyMigrations(
  database: SQLite.SQLiteDatabase,
  currentVersion: number,
): Promise<void> {
  let version = currentVersion;

  if (version < 1) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        CREATE TABLE wallet_items (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          subtitle TEXT,
          description TEXT,
          image_uri TEXT,
          color TEXT,
          icon TEXT,
          details_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX wallet_items_type_category_idx
          ON wallet_items (type, category);
      `);
      await transaction.execAsync('PRAGMA user_version = 1;');
    });
    version = 1;
  }

  if (version < 2) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(
        'ALTER TABLE wallet_items RENAME COLUMN image_uri TO image_id;',
      );
      await transaction.execAsync('PRAGMA user_version = 2;');
    });
  }
}

async function initializeWalletDatabase(): Promise<SQLite.SQLiteDatabase> {
  const directory = SQLite.defaultDatabaseDirectory;
  if (typeof directory !== 'string') {
    throw new Error('The native SQLite database directory is unavailable.');
  }

  const legacyDatabase = new File(directory, LEGACY_DATABASE_NAME);
  if (legacyDatabase.exists) {
    throw new Error(
      'An unencrypted legacy wallet database was found. An explicit migration is required before opening wallet data.',
    );
  }

  assertNoLegacyWalletFiles();
  const databaseFile = new File(directory, DATABASE_NAME);
  if (!databaseFile.exists) {
    if ((await hasEncryptedWalletFiles()) && !(await hasMasterKey())) {
      throw new Error('Encrypted wallet files exist but their key is unavailable.');
    }
    await initializeWalletKeys();
  }

  return withDatabaseKey(async (key) => {
    const database = await SQLite.openDatabaseAsync(DATABASE_NAME, {}, directory);
    const keyHex = await key.encoded('hex');
    if (!/^[0-9a-f]{64}$/i.test(keyHex)) {
      await database.closeAsync();
      throw new Error('The wallet database key has an unsupported format.');
    }

    try {
      await database.execAsync(`PRAGMA key = "x'${keyHex}'";`);

      const cipherVersion = await database.getFirstAsync<{ cipher_version: string }>(
        'PRAGMA cipher_version;',
      );
      if (!cipherVersion?.cipher_version) {
        throw new Error(
          'SQLCipher is unavailable in this native build. Use a development or production build; Expo Go is not supported.',
        );
      }

      const schemaCheck = await database.getFirstAsync<{ count: number }>(
        'SELECT count(*) AS count FROM sqlite_master;',
      );
      if (schemaCheck === null) {
        throw new Error('Could not validate the encrypted wallet database.');
      }

      await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

      const versionRow = await database.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version;',
      );
      if (versionRow === null) {
        throw new Error('Could not read the wallet database schema version.');
      }
      if (versionRow.user_version > DATABASE_SCHEMA_VERSION) {
        throw new Error(
          `Wallet database version ${versionRow.user_version} is newer than supported version ${DATABASE_SCHEMA_VERSION}.`,
        );
      }

      await applyMigrations(database, versionRow.user_version);
      return database;
    } catch (error) {
      await database.closeAsync();
      throw error;
    }
  });
}

export function getWalletDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = initializeWalletDatabase().catch((error: unknown) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}
