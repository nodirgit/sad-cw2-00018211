import { useState } from 'react';
import type { DeathLogResult } from '../../application/services/MortalityService';
import { useUser } from '../AppContext';
import { HousePicker, useDefaultHouse } from '../components/HousePicker';
import { ErrorNotice, Notice } from '../components/Notice';
import { Screen } from '../components/Screen';
import { ago, time } from '../format';
import { useAction } from '../useAction';

/** FR-01: the worker who finds a dead chick logs it here, at once, tagged to the house. */
export function LogDeathScreen({ houseId: initial }: { houseId?: string }) {
  const { c, user, refresh } = useUser();
  const [houseId, setHouseId] = useState(useDefaultHouse(initial));
  const [count, setCount] = useState(1);
  const [result, setResult] = useState<DeathLogResult | null>(null);
  const [countedAnyway, setCountedAnyway] = useState(false);
  const { error, run } = useAction();

  const house = c.farm.house(houseId);
  const batch = house.currentBatch();

  function save() {
    const r = run(() => c.mortality.logDeath(houseId, count, user));
    if (r) {
      setResult(r);
      setCountedAnyway(false);
      refresh();
    }
  }

  function countSeparately() {
    if (!result) return;
    run(() => c.mortality.countSeparately(result.record.getId()));
    setCountedAnyway(true);
    refresh();
  }

  return (
    <Screen title="Log death" subtitle="FR-01 · direct from the house">
      <div className="field">
        <label>House</label>
        <HousePicker value={houseId} onChange={(id) => { setHouseId(id); setResult(null); }} />
      </div>

      <div className="field">
        <label>How many dead chicks?</label>
        <div className="stepper">
          <button onClick={() => setCount(Math.max(1, count - 1))} aria-label="One less">−</button>
          <div className="value" aria-live="polite">{count}</div>
          <button onClick={() => setCount(count + 1)} aria-label="One more">+</button>
        </div>
      </div>

      <button className="btn btn-primary btn-huge" onClick={save} disabled={!batch}>
        Save
      </button>

      <ErrorNotice error={error} />
      {result && !result.duplicateOf && (
        <Notice kind="ok" title="Saved">
          {result.record.getCount()} in {house.getName()}, {time(result.record.getTimestamp())}, by {user.getName()}. Deaths today: {batch && c.mortality.deathsToday(batch.getId())}.
        </Notice>
      )}
      {result?.duplicateOf && !countedAnyway && (
        <Notice kind="warn" title="Possible duplicate — not counted twice">
          {result.duplicateOf.getLoggedBy().getName()} logged {result.duplicateOf.getCount()} in {house.getName()} {ago(result.duplicateOf.getTimestamp())}. Your entry is kept but not added to the total.
          <button className="btn btn-warn" onClick={countSeparately}>
            It was a different bird — count it
          </button>
        </Notice>
      )}
      {result?.duplicateOf && countedAnyway && <Notice kind="ok" title="Counted as a separate death" />}

      {batch && (
        <div className="card">
          <h2>{house.getName()} — latest entries</h2>
          <div className="lines">
            {c.mortality.recordsForBatch(batch.getId()).slice(0, 6).map((r) => (
              <div key={r.getId()} className={`line ${r.isFlaggedDuplicate() ? 'flagged' : ''}`}>
                <span className="l">
                  {r.getLoggedBy().getName()} · {ago(r.getTimestamp())}
                  {r.isFlaggedDuplicate() && <span className="chip warn" style={{ marginLeft: 6 }}>duplicate</span>}
                </span>
                <span className="r">{r.getCount()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Screen>
  );
}
