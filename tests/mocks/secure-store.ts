const values = new Map<string, string>();

export const secureStoreMock = {
  values,
  getItemAsync: jest.fn(async (key: string): Promise<string | null> => values.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string): Promise<void> => {
    values.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string): Promise<void> => {
    values.delete(key);
  }),
  reset(): void {
    values.clear();
    this.getItemAsync.mockClear();
    this.setItemAsync.mockClear();
    this.deleteItemAsync.mockClear();
  },
};
