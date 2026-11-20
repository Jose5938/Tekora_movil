const pending = new Map<string, string>();

export const intentStorage = {
  read: async (key: string) => pending.get(key) ?? null,
  write: async (key: string, value: string) => { pending.set(key, value); },
  remove: async (key: string) => { pending.delete(key); },
};
