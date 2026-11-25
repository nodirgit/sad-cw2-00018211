import { useUser } from '../AppContext';
import { HouseCard } from '../components/HouseCard';
import { Screen } from '../components/Screen';
import { useTicker } from '../useTicker';

/** Worker's home: the same house cards, only the two things a worker records, and no money (NFR-03). */
export function WorkerHome() {
  const { c, go, refresh } = useUser();
  useTicker(refresh, 3000);

  return (
    <Screen title={c.farm.farm().getName()} subtitle="Worker view">
      {c.farm.houses().map((h) => (
        <HouseCard key={h.getId()} house={h} />
      ))}
      <div className="section-title">Record</div>
      <div className="tiles">
        <button className="tile" onClick={() => go({ name: 'death' })}>
          <b>Log death</b>
          <span>FR-01</span>
        </button>
        <button className="tile" onClick={() => go({ name: 'feed' })}>
          <b>Feed delivery</b>
          <span>FR-02</span>
        </button>
      </div>
      <p className="tiny muted">Costs, sales and profit are visible only to the Director (NFR-03).</p>
    </Screen>
  );
}
