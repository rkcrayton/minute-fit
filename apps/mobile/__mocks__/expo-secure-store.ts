/**
 * Manual mock for expo-secure-store.
 * Uses an in-memory Map so tests can set/get/delete without touching native.
 */
const store = new Map<string, string>();

export const getItemAsync = jest.fn(async (key: string) => store.get(key) ?? null);

export const setItemAsync = jest.fn(async (key: string, value: string) => {
  store.set(key, value);
});

export const deleteItemAsync = jest.fn(async (key: string) => {
  store.delete(key);
});

/** Test helper: reset the in-memory store between tests. */
export const __reset = () => {
  store.clear();
  getItemAsync.mockClear();
  setItemAsync.mockClear();
  deleteItemAsync.mockClear();
};
