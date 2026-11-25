import type { Route } from '../AppContext';
import { useUser } from '../AppContext';
import { HouseCard } from '../components/HouseCard';
import { Screen } from '../components/Screen';
import { useTicker } from '../useTicker';

const ACTIONS: { label: string; req: string; route: Route }[] = [
  { label: 'Log death', req: 'FR-01', route: { name: 'death' } },
  { label: 'Feed delivery', req: 'FR-02', route: { name: 'feed' } },
  { label: 'Slaughter', req: 'FR-04 · NFR-04', route: { name: 'slaughter' } },
  { label: 'Agent cross-check', req: 'FR-05', route: { name: 'crosscheck' } },
  { label: 'Voice entry', req: 'FR-06', route: { name: 'voice' } },
  { label: 'Batch profit', req: 'FR-03', route: { name: 'profit' } },
];

/** Director's home: every house live, every action, money screens included. */
export function DirectorHome() {
  const { c, go, refresh } = useUser();
  useTicker(refresh, 3000);
  const farm = c.farm.farm();

  return (
    <Screen title={farm.getName()} subtitle={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}>
      {farm.getHouses().map((h) => (
        <HouseCard key={h.getId()} house={h} />
      ))}

      <div className="section-title">Record & check</div>
      <div className="tiles">
        {ACTIONS.map((a) => (
          <button key={a.label} className="tile" onClick={() => go(a.route)}>
            <b>{a.label}</b>
            <span>{a.req}</span>
          </button>
        ))}
        <button className="tile disabled" disabled aria-disabled>
          <b>Flock density</b>
          <span>FR-09 · coming later (needs camera analytics)</span>
        </button>
        <button className="tile" onClick={() => go({ name: 'settings' })}>
          <b>Settings</b>
          <span>Houses · ranges · demo data</span>
        </button>
      </div>
    </Screen>
  );
}
