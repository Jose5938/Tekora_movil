import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { api } from '@/api/client';
import { SessionController } from './session';
import { sessionStorage } from './storage';

const session = new SessionController(api, sessionStorage);
const Context = createContext<SessionController | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => {
    void session.restore();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') void session.revalidate();
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!state.expiresAt) return;
    const delay = Math.max(0, Math.min(Date.parse(state.expiresAt) - Date.now(), 2_147_483_647));
    const timer = setTimeout(() => { void session.checkExpiration(); }, delay);
    // Check long-lived credentials too (JS timers are capped at about 24 days).
    const interval = setInterval(() => { void session.checkExpiration(); }, 30000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [state.expiresAt]);
  return <Context.Provider value={session}>{children}</Context.Provider>;
}

export function useSession() {
  const controller = useContext(Context);
  if (!controller) throw new Error('SessionProvider is required');
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  return { ...state, login: controller.login, logout: controller.logout, retry: controller.restore };
}
