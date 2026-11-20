import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import { ApiError } from './http';
import { intentStorage } from './intent-storage';
import { isUuid } from './quotes';
import { isRecord } from './types';

export function reservationScope(account: number, action: 'proposal' | 'cancel' | 'commit', id: number) {
  return `tekora.mobile.reservation.${account}.${action}.${id}`;
}

export async function commandIntent(scope: string, payload: object): Promise<string> {
  const serialized = JSON.stringify(payload);
  try {
    const digest = await digestStringAsync(CryptoDigestAlgorithm.SHA256, serialized);
    const saved = await intentStorage.read(scope);
    if (saved !== null) {
      const intent: unknown = JSON.parse(saved);
      if (!isRecord(intent) || !isUuid(intent.key)) throw new Error();
      if (intent.digest !== digest && intent.payload !== serialized) {
        throw new ApiError(0, 'intent_pending', 'Hay una operación sin verificar. Consulta tus reservas antes de elegir otros datos.');
      }
      return intent.key;
    }
    const key = randomUUID();
    await intentStorage.write(scope, JSON.stringify({ key, digest }));
    return key;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'secure_storage', 'No se pudo conservar la intención. No se envió la operación.');
  }
}

export async function finishCommandIntent(scope: string) {
  try { await intentStorage.remove(scope); } catch { /* A retained key stays safe to replay with its original body. */ }
}
