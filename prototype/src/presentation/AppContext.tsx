import { createContext, useContext } from 'react';
import type { Container } from '../app/container';
import type { User } from '../domain/people/User';

/** Screens of the app; a param says what to pre-select. */
export type Route =
  | { name: 'home' }
  | { name: 'death'; houseId?: string }
  | { name: 'feed'; houseId?: string }
  | { name: 'profit' }
  | { name: 'slaughter' }
  | { name: 'crosscheck'; sessionId?: string }
  | { name: 'voice' }
  | { name: 'settings' };

export interface AppState {
  c: Container;
  user: User | null;
  route: Route;
  go(route: Route): void;
  back(): void;
  login(user: User): void;
  logout(): void;
  /** Re-render after a service changed data. */
  refresh(): void;
}

export const AppCtx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const state = useContext(AppCtx);
  if (!state) throw new Error('useApp outside AppCtx');
  return state;
}

/** For screens that only render after login. */
export function useUser() {
  const app = useApp();
  if (!app.user) throw new Error('Not logged in');
  return { ...app, user: app.user };
}
