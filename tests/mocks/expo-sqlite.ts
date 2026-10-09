type DatabaseState = {
  schemaVersion: number;
  cipherAvailable: boolean;
  schemaReadable: boolean;
  events: string[];
  openCalls: Array<[string, unknown, string | undefined]>;
};

const state: DatabaseState = {
  schemaVersion: 0,
  cipherAvailable: true,
  schemaReadable: true,
  events: [],
  openCalls: [],
};

function updateSchemaVersion(sql: string): void {
  const match = sql.match(/PRAGMA user_version\s*=\s*(\d+)/i);
  if (match) {
    state.schemaVersion = Number(match[1]);
  }
}

const transaction = {
  execAsync: jest.fn(async (sql: string): Promise<void> => {
    state.events.push(`transaction:${sql}`);
    updateSchemaVersion(sql);
  }),
};

const database = {
  execAsync: jest.fn(async (sql: string): Promise<void> => {
    state.events.push(`exec:${sql}`);
  }),
  getFirstAsync: jest.fn(async (sql: string): Promise<Record<string, unknown> | null> => {
    state.events.push(`query:${sql}`);
    if (sql.includes('cipher_version')) {
      return state.cipherAvailable ? { cipher_version: 'test-cipher' } : null;
    }
    if (sql.includes('user_version')) {
      return { user_version: state.schemaVersion };
    }
    if (sql.includes('sqlite_master')) {
      if (!state.schemaReadable) {
        throw new Error('Encrypted database could not be opened.');
      }
      return { count: 0 };
    }
    return null;
  }),
  withExclusiveTransactionAsync: jest.fn(
    async (task: (value: typeof transaction) => Promise<void>): Promise<void> => {
      await task(transaction);
    },
  ),
  closeAsync: jest.fn(async (): Promise<void> => undefined),
};

export const openDatabaseAsync = jest.fn(
  async (
    databaseName: string,
    options: unknown,
    directory: string,
  ): Promise<typeof database> => {
    state.openCalls.push([databaseName, options, directory]);
    state.events.push('open');
    return database;
  },
);

export const sqliteMock = {
  state,
  database,
  transaction,
  openDatabaseAsync,
  reset(schemaVersion = 0, cipherAvailable = true, schemaReadable = true): void {
    state.schemaVersion = schemaVersion;
    state.cipherAvailable = cipherAvailable;
    state.schemaReadable = schemaReadable;
    state.events.length = 0;
    state.openCalls.length = 0;
    openDatabaseAsync.mockClear();
    database.execAsync.mockClear();
    database.getFirstAsync.mockClear();
    database.withExclusiveTransactionAsync.mockClear();
    database.closeAsync.mockClear();
    transaction.execAsync.mockClear();
  },
};

export const defaultDatabaseDirectory = 'file:///wallet-document/SQLite';
