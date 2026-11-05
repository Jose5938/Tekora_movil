import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { ApiError } from '@/api/http';

export function useApiResource<T>(path: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ path: string | null; attempt: number; data: T | null; error: unknown; loading: boolean }>({
    path, attempt: -1, data: null, error: null, loading: true,
  });
  useEffect(() => {
    let active = true;
    const request = path ? api.request<T>(path) : Promise.reject(new ApiError(404, 'not_found', 'Selecciona un recurso válido del catálogo.'));
    request.then(data => {
      if (active) setState({ path, attempt, data, error: null, loading: false });
    }, error => {
      if (active) setState({ path, attempt, data: null, error, loading: false });
    });
    return () => { active = false; };
  }, [path, attempt]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const current = state.path === path && state.attempt === attempt;
  return { data: current ? state.data : null, error: current ? state.error : null, loading: !current || state.loading, retry };
}
