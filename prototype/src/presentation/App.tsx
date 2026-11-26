import { useState } from 'react';
import type { Container } from '../app/container';
import type { User } from '../domain/people/User';
import { AppCtx, AppState, Route, TAB_ROOT, TabId } from './AppContext';
import { DirectorOnly } from './components/DirectorOnly';
import { TabBar } from './components/TabBar';
import { BatchProfitScreen } from './screens/BatchProfitScreen';
import { CrossCheckScreen } from './screens/CrossCheckScreen';
import { DirectorHome } from './screens/DirectorHome';
import { DirectSaleScreen } from './screens/DirectSaleScreen';
import { ExpenseEntryScreen } from './screens/ExpenseEntryScreen';
import { FeedDeliveryScreen } from './screens/FeedDeliveryScreen';
import { LogDeathScreen } from './screens/LogDeathScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SalesScreen } from './screens/SalesScreen';
import { PartnerNewScreen, PartnerScreen, PartnersScreen } from './screens/PartnersScreen';
import { DemoDataScreen, ExpenseCategoriesScreen, HouseNewScreen, HouseSettingsScreen, HousesScreen } from './screens/SettingsScreen';
import { SlaughterScreen } from './screens/SlaughterScreen';
import { WorkerHome } from './screens/WorkerHome';

interface Nav {
  tab: TabId;
  stack: Route[];
}
const START: Nav = { tab: 'main', stack: [TAB_ROOT.main] };

/** Presentation root: holds who is logged in, the open section and its screens. No business rules here. */
export function App({ container }: { container: Container }) {
  const [user, setUser] = useState<User | null>(null);
  const [nav, setNav] = useState<Nav>(START);
  const [, setVersion] = useState(0);

  const state: AppState = {
    c: container,
    user,
    route: nav.stack[nav.stack.length - 1],
    tab: nav.tab,
    canGoBack: nav.stack.length > 1,
    go: (route) => setNav((n) => ({ ...n, stack: [...n.stack, route] })),
    back: () => setNav((n) => (n.stack.length > 1 ? { ...n, stack: n.stack.slice(0, -1) } : n)),
    switchTab: (tab) => {
      setNav({ tab, stack: [TAB_ROOT[tab]] });
      window.scrollTo(0, 0);
    },
    // The LoginScreen has already checked the PIN through AuthService.
    login: (u) => {
      setUser(u);
      setNav(START);
    },
    logout: () => {
      container.auth.logout();
      setUser(null);
      setNav(START);
    },
    refresh: () => setVersion((v) => v + 1),
  };

  return (
    <AppCtx.Provider value={state}>
      <div className="app">
        {user ? (
          <>
            <Router />
            <TabBar />
          </>
        ) : (
          <LoginScreen />
        )}
      </div>
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
    case 'profile':
      return <ProfileScreen />;
    // NFR-03: money screens only under the Director's login
    case 'profit':
      return director ? <BatchProfitScreen /> : <DirectorOnly />;
    case 'slaughter':
      return director ? <SlaughterScreen /> : <DirectorOnly />;
    case 'crosscheck':
      return director ? <CrossCheckScreen sessionId={r.sessionId} /> : <DirectorOnly />;
    case 'sales':
      return director ? <SalesScreen /> : <DirectorOnly />;
    case 'sale':
      return director ? <DirectSaleScreen /> : <DirectorOnly />;
    case 'expense':
      return director ? <ExpenseEntryScreen editId={r.editId} /> : <DirectorOnly />;
    case 'settings-houses':
      return director ? <HousesScreen /> : <DirectorOnly />;
    case 'settings-house':
      return director ? <HouseSettingsScreen houseId={r.houseId} /> : <DirectorOnly />;
    case 'settings-house-new':
      return director ? <HouseNewScreen /> : <DirectorOnly />;
    case 'settings-partners':
      return director ? <PartnersScreen /> : <DirectorOnly />;
    case 'settings-partner':
      return director ? <PartnerScreen key={r.partnerId} partnerId={r.partnerId} /> : <DirectorOnly />;
    case 'settings-partner-new':
      return director ? <PartnerNewScreen /> : <DirectorOnly />;
    case 'settings-categories':
      return director ? <ExpenseCategoriesScreen /> : <DirectorOnly />;
    case 'settings-demo':
      return director ? <DemoDataScreen /> : <DirectorOnly />;
  }
}
