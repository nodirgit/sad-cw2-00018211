import { useState } from 'react';
import type { Container } from '../app/container';
import type { User } from '../domain/people/User';
import { AppCtx, AppState, Route } from './AppContext';
import { DirectorOnly } from './components/DirectorOnly';
import { BatchProfitScreen } from './screens/BatchProfitScreen';
import { CrossCheckScreen } from './screens/CrossCheckScreen';
import { DirectorHome } from './screens/DirectorHome';
import { DirectSaleScreen } from './screens/DirectSaleScreen';
import { ExpenseEntryScreen } from './screens/ExpenseEntryScreen';
import { FeedDeliveryScreen } from './screens/FeedDeliveryScreen';
import { LogDeathScreen } from './screens/LogDeathScreen';
import { LoginScreen } from './screens/LoginScreen';
import { DemoDataScreen, HouseNewScreen, HouseSettingsScreen, HousesScreen, SettingsScreen, SuppliersScreen } from './screens/SettingsScreen';
import { SlaughterScreen } from './screens/SlaughterScreen';
import { WorkerHome } from './screens/WorkerHome';

/** Presentation root: holds who is logged in and which screen is open. No business rules here. */
export function App({ container }: { container: Container }) {
  const [user, setUser] = useState<User | null>(null);
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [, setVersion] = useState(0);

  const state: AppState = {
    c: container,
    user,
    route: stack[stack.length - 1],
    go: (route) => setStack((s) => [...s, route]),
    back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    // The LoginScreen has already checked the PIN through AuthService.
    login: (u) => {
      setUser(u);
      setStack([{ name: 'home' }]);
    },
    logout: () => {
      container.auth.logout();
      setUser(null);
      setStack([{ name: 'home' }]);
    },
    refresh: () => setVersion((v) => v + 1),
  };

  return (
    <AppCtx.Provider value={state}>
      <div className="app">{user ? <Router /> : <LoginScreen />}</div>
    </AppCtx.Provider>
  );
}

function Router() {
  return <AppCtx.Consumer>{(s) => (s ? screenFor(s) : null)}</AppCtx.Consumer>;
}

function screenFor(s: AppState) {
  const director = s.user !== null && s.c.policy.canSeeMoney(s.user);
  const r = s.route;
  switch (r.name) {
    case 'home':
      return director ? <DirectorHome /> : <WorkerHome />;
    case 'death':
      return <LogDeathScreen houseId={r.houseId} />;
    case 'feed':
      return <FeedDeliveryScreen houseId={r.houseId} />;
    // NFR-03: money screens only under the Director's login
    case 'profit':
      return director ? <BatchProfitScreen /> : <DirectorOnly />;
    case 'slaughter':
      return director ? <SlaughterScreen /> : <DirectorOnly />;
    case 'crosscheck':
      return director ? <CrossCheckScreen sessionId={r.sessionId} /> : <DirectorOnly />;
    case 'sale':
      return director ? <DirectSaleScreen /> : <DirectorOnly />;
    case 'expense':
      return director ? <ExpenseEntryScreen editId={r.editId} /> : <DirectorOnly />;
    case 'settings':
      return director ? <SettingsScreen /> : <DirectorOnly />;
    case 'settings-houses':
      return director ? <HousesScreen /> : <DirectorOnly />;
    case 'settings-house':
      return director ? <HouseSettingsScreen houseId={r.houseId} /> : <DirectorOnly />;
    case 'settings-house-new':
      return director ? <HouseNewScreen /> : <DirectorOnly />;
    case 'settings-suppliers':
      return director ? <SuppliersScreen /> : <DirectorOnly />;
    case 'settings-demo':
      return director ? <DemoDataScreen /> : <DirectorOnly />;
  }
}
