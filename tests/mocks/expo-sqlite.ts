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

const itemsTable = new Map<string, Record<string, unknown>>();

const database = {
  execAsync: jest.fn(async (sql: string): Promise<void> => {
    state.events.push(`exec:${sql}`);
  }),
  runAsync: jest.fn(
    async (
      sql: string,
      ...params: unknown[]
    ): Promise<{ changes: number; lastInsertRowId: number }> => {
      state.events.push(`run:${sql}`);
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();
      const actualParams = Array.isArray(params[0]) ? (params[0] as unknown[]) : params;

      if (normalizedSql.startsWith('INSERT INTO wallet_items')) {
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
        ] = actualParams;
        itemsTable.set(id as string, {
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
        return { changes: 1, lastInsertRowId: 1 };
      }
      if (normalizedSql.startsWith('UPDATE wallet_items')) {
        const [
          category,
          title,
          subtitle,
          description,
          image_id,
          color,
          icon,
          details_json,
          updated_at,
          id,
        ] = actualParams;
        const existing = itemsTable.get(id as string);
        if (existing) {
          itemsTable.set(id as string, {
            ...existing,
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
          return { changes: 1, lastInsertRowId: 1 };
        }
        return { changes: 0, lastInsertRowId: 0 };
      }
      if (normalizedSql.startsWith('DELETE FROM wallet_items')) {
        const [id] = actualParams;
        const existed = itemsTable.delete(id as string);
        return { changes: existed ? 1 : 0, lastInsertRowId: 0 };
      }
      return { changes: 0, lastInsertRowId: 0 };
    },
  ),
  getAllAsync: jest.fn(
    async (sql: string, ...params: unknown[]): Promise<Array<Record<string, unknown>>> => {
      state.events.push(`query:${sql}`);
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();
      const actualParams = Array.isArray(params[0]) ? (params[0] as unknown[]) : params;

      if (normalizedSql.includes('FROM wallet_items')) {
        let rows = Array.from(itemsTable.values());
        if (normalizedSql.includes('type = ?')) {
          const typeParam = actualParams[0];
          rows = rows.filter((r) => r.type === typeParam);
        }
        if (normalizedSql.includes('category = ?')) {
          const catParam = normalizedSql.includes('type = ?') ? actualParams[1] : actualParams[0];
          rows = rows.filter((r) => r.category === catParam);
        }
        return rows.map((r) => ({ ...r }));
      }
      return [];
    },
  ),
  getFirstAsync: jest.fn(
    async (sql: string, ...params: unknown[]): Promise<Record<string, unknown> | null> => {
      state.events.push(`query:${sql}`);
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();
      const actualParams = Array.isArray(params[0]) ? (params[0] as unknown[]) : params;

      if (normalizedSql.includes('cipher_version')) {
        return state.cipherAvailable ? { cipher_version: 'test-cipher' } : null;
      }
      if (normalizedSql.includes('user_version')) {
        return { user_version: state.schemaVersion };
      }
      if (normalizedSql.includes('sqlite_master')) {
        if (!state.schemaReadable) {
          throw new Error('Encrypted database could not be opened.');
        }
        return { count: 0 };
      }
      if (normalizedSql.includes('FROM wallet_items WHERE id = ?')) {
        const [id] = actualParams;
        const found = itemsTable.get(id as string);
        return found ? { ...found } : null;
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
  itemsTable,
  openDatabaseAsync,
  reset(schemaVersion = 0, cipherAvailable = true, schemaReadable = true): void {
    state.schemaVersion = schemaVersion;
    state.cipherAvailable = cipherAvailable;
    state.schemaReadable = schemaReadable;
    state.events.length = 0;
    state.openCalls.length = 0;
    itemsTable.clear();
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
