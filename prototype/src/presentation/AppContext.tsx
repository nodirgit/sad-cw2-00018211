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
  | { name: 'sales' }
  | { name: 'sale' }
  | { name: 'expense'; editId?: string }
  | { name: 'profile' }
  | { name: 'settings-houses' }
  | { name: 'settings-house'; houseId: string }
  | { name: 'settings-house-new' }
  | { name: 'settings-suppliers' }
  | { name: 'settings-demo' };

/** The sections in the bottom bar. Each one keeps its own stack of screens. */
export type TabId = 'main' | 'slaughter' | 'sales' | 'expenses' | 'profile';

/** The first screen of each section. */
export const TAB_ROOT: Record<TabId, Route> = {
  main: { name: 'home' },
  slaughter: { name: 'slaughter' },
  sales: { name: 'sales' },
  expenses: { name: 'expense' },
  profile: { name: 'profile' },
};

export interface AppState {
  c: Container;
  user: User | null;
  route: Route;
  /** Section the open screen belongs to. */
  tab: TabId;
  /** True when the open screen was opened from another screen of the same section. */
  canGoBack: boolean;
  go(route: Route): void;
  back(): void;
  /** Open a section at its first screen (tapping the open section goes back to its first screen). */
  switchTab(tab: TabId): void;
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
