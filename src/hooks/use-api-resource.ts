import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { ApiError, retryDeadline } from '@/api/http';

export function useApiResource<T>(path: string | null, validate: (value: unknown) => value is T, authenticated = false) {
  const [attempt, setAttempt] = useState(0);
  const retryGate = useRef<{ path: string | null; until: number } | undefined>(undefined);
  const [state, setState] = useState<{ path: string | null; attempt: number; data: T | null; error: unknown; loading: boolean; retryAt?: number }>({
    path, attempt: -1, data: null, error: null, loading: true,
  });
  useEffect(() => {
    let active = true;
    const request = path ? api.request<unknown>(path, { authenticated }).then(value => {
      if (!validate(value)) throw new ApiError(200, 'invalid_response', 'Tekora devolvió datos inesperados. Reintenta.');
      return value;
    }) : Promise.reject(new ApiError(404, 'not_found', 'Selecciona un recurso válido del catálogo.'));
    request.then(data => {
      if (active) setState({ path, attempt, data, error: null, loading: false });
    }, error => {
      if (!active) return;
      const retryAt = retryDeadline(error);
      retryGate.current = { path, until: retryAt };
      setState({ path, attempt, data: null, error, loading: false, retryAt });
    });
    return () => { active = false; };
  }, [path, attempt, validate, authenticated]);
  const retry = useCallback(() => {
    const gate = retryGate.current;
    if (gate?.path === path && gate.until > Date.now()) return;
    setAttempt(value => value + 1);
  }, [path]);
  const current = state.path === path && state.attempt === attempt;
  return { data: current ? state.data : null, error: current ? state.error : null, loading: !current || state.loading, retryAt: current ? state.retryAt : undefined, retry };
}
