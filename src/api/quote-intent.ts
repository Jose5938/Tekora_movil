import { randomUUID } from 'expo-crypto';
import { ApiError } from './http';
import { intentStorage } from './intent-storage';
import { isUuid } from './quotes';

const loading = new Map<string, Promise<string>>();

const storageKey = (account: number, inquiry: number) => `tekora.mobile.quote.${account}.${inquiry}`;

export function quoteIntent(account: number, inquiry: number): Promise<string> {
  const scope = storageKey(account, inquiry);
  const existing = loading.get(scope);
  if (existing) return existing;
  const operation = loadOrCreate(scope).finally(() => { loading.delete(scope); });
  loading.set(scope, operation);
  return operation;
}

async function loadOrCreate(scope: string): Promise<string> {
  try {
    const saved = await intentStorage.read(scope);
    if (isUuid(saved)) return saved;
    if (saved !== null) throw new Error();
    const key = randomUUID();
    await intentStorage.write(scope, key);
    return key;
  } catch {
    throw new ApiError(0, 'secure_storage', 'No se pudo conservar la intención de cotización. No se envió la operación.');
  }
}

export const finishQuoteIntent = (account: number, inquiry: number) => intentStorage.remove(storageKey(account, inquiry));
