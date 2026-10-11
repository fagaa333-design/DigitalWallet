type DatabaseState = {
  schemaVersion: number;
  cipherAvailable: boolean;
  schemaReadable: boolean;
  events: string[];
  openCalls: Array<[string, unknown, string | undefined]>;
  rows: Map<string, Record<string, unknown>>;
};

const state: DatabaseState = {
  schemaVersion: 0,
  cipherAvailable: true,
  schemaReadable: true,
  events: [],
  openCalls: [],
  rows: new Map(),
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
  runAsync: jest.fn(
    async (
      sql: string,
      ...params: any[]
    ): Promise<{ lastInsertRowId: number; changes: number }> => {
      state.events.push(`run:${sql}`);
      if (/INSERT\s+INTO\s+wallet_items/i.test(sql)) {
        const flatParams = params.flat();
        const [
          id,
          type,
          category,
          title,
          subtitle,
          description,
          image_id,
          color,
          icon,
          details_json,
          created_at,
          updated_at,
        ] = flatParams;
        state.rows.set(id, {
          id,
          type,
          category,
          title,
          subtitle,
          description,
          image_id,
          color,
          icon,
          details_json,
          created_at,
          updated_at,
        });
        return { lastInsertRowId: 1, changes: 1 };
      }
      if (/UPDATE\s+wallet_items/i.test(sql)) {
        const flatParams = params.flat();
        const id = flatParams[flatParams.length - 1];
        const existing = state.rows.get(id);
        if (existing) {
          const [
            type,
            category,
            title,
            subtitle,
            description,
            image_id,
            color,
            icon,
            details_json,
            updated_at,
          ] = flatParams;
          state.rows.set(id, {
            ...existing,
            type,
            category,
            title,
            subtitle,
            description,
            image_id,
            color,
            icon,
            details_json,
            updated_at,
          });
          return { lastInsertRowId: 1, changes: 1 };
        }
        return { lastInsertRowId: 0, changes: 0 };
      }
      if (/DELETE\s+FROM\s+wallet_items/i.test(sql)) {
        const flatParams = params.flat();
        const [id] = flatParams;
        const deleted = state.rows.delete(id);
        return { lastInsertRowId: 0, changes: deleted ? 1 : 0 };
      }
      return { lastInsertRowId: 1, changes: 1 };
    },
  ),
  getAllAsync: jest.fn(async <T>(sql: string, ..._params: any[]): Promise<T[]> => {
    state.events.push(`getAll:${sql}`);
    if (/FROM wallet_items/i.test(sql)) {
      const list = Array.from(state.rows.values());
      list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return list as unknown as T[];
    }
    return [];
  }),
  getFirstAsync: jest.fn(
    async (sql: string, ...params: any[]): Promise<Record<string, unknown> | null> => {
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
      if (/FROM\s+wallet_items\s+WHERE\s+id\s*=\s*\?/i.test(sql)) {
        const flatParams = params.flat();
        const id = flatParams[0];
        return state.rows.get(id) || null;
      }
      return null;
    },
  ),
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
    state.rows.clear();
    openDatabaseAsync.mockClear();
    database.execAsync.mockClear();
    database.runAsync.mockClear();
    database.getAllAsync.mockClear();
    database.getFirstAsync.mockClear();
    database.withExclusiveTransactionAsync.mockClear();
    database.closeAsync.mockClear();
    transaction.execAsync.mockClear();
  },
};

export const defaultDatabaseDirectory = 'file:///wallet-document/SQLite';
