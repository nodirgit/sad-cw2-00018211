import { useState } from 'react';
import type { DeathLogResult } from '../../application/services/MortalityService';
import type { MortalityRecord } from '../../domain/farm/MortalityRecord';
import { useUser } from '../AppContext';
import { HousePicker, useDefaultHouse } from '../components/HousePicker';
import { ErrorNotice, Notice } from '../components/Notice';
import { EditButtons, RowActions } from '../components/RowActions';
import { Screen } from '../components/Screen';
import { ago, parseNumber, time } from '../format';
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
          <p className="tiny muted" style={{ marginTop: -4 }}>You can correct or delete your own entries; the Director can change any.</p>
          <div>
            {c.mortality.recordsForBatch(batch.getId()).slice(0, 8).map((r) => (
              <DeathRow key={r.getId()} record={r} onChanged={() => setResult(null)} />
            ))}
          </div>
        </div>
      )}
    </Screen>
  );
}

function DeathRow({ record, onChanged }: { record: MortalityRecord; onChanged: () => void }) {
  const { c, user, refresh } = useUser();
  const [editing, setEditing] = useState(false);
  const [count, setCount] = useState(String(record.getCount()));
  const { error, setError, run } = useAction();
  const can = c.mortality.canChange(record, user);

  function save() {
    if (run(() => c.mortality.editDeath(record.getId(), parseNumber(count), user))) {
      setEditing(false);
      onChanged();
      refresh();
    }
  }

  function remove() {
    if (run(() => (c.mortality.deleteDeath(record.getId(), user), true))) {
      onChanged();
      refresh();
    }
  }

  return (
    <div className={`rec ${record.isFlaggedDuplicate() ? 'flagged' : ''}`}>
      <div className="top">
        <div className="main">
          {record.getLoggedBy().getName()} · {ago(record.getTimestamp())}
          {record.isFlaggedDuplicate() && <span className="chip warn" style={{ marginLeft: 6 }}>duplicate</span>}
        </div>
        <span className="val">{record.getCount()}</span>
        {can && !editing && (
          <RowActions
            onEdit={() => { setCount(String(record.getCount())); setError(null); setEditing(true); }}
            onDelete={remove}
            confirmText={`Delete this entry (${record.getCount()} dead, ${time(record.getTimestamp())})?`}
          />
        )}
      </div>
      {editing && (
        <>
          <input className="input" inputMode="numeric" style={{ marginTop: 8 }} value={count} onChange={(e) => setCount(e.target.value)} aria-label="Correct count" />
          <EditButtons onCancel={() => { setEditing(false); setError(null); }} onSave={save} saveDisabled={!count} />
        </>
      )}
      <ErrorNotice error={error} />
    </div>
  );
}
