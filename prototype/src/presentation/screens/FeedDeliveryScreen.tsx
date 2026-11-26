import { useState } from 'react';
import type { FeedDeliveryResult } from '../../application/services/FeedService';
import { useUser } from '../AppContext';
import { HousePicker, useDefaultHouse } from '../components/HousePicker';
import { ErrorNotice, Notice } from '../components/Notice';
import { Screen } from '../components/Screen';
import { dayMonth, num, parseNumber, uzs } from '../format';
import { useAction } from '../useAction';

/** FR-02: each delivery tied to its supplier and to the open batch of the chosen house. */
export function FeedDeliveryScreen({ houseId: initial }: { houseId?: string }) {
  const { c, user, refresh } = useUser();
  const suppliers = c.feed.feedSuppliers();
  const [houseId, setHouseId] = useState(useDefaultHouse(initial));
  const [supplierId, setSupplierId] = useState(suppliers[0]?.getId() ?? '');
  const [kg, setKg] = useState('');
  const [cost, setCost] = useState('');
  const [result, setResult] = useState<FeedDeliveryResult | null>(null);
  const { error, setError, run } = useAction();
  const canSeeMoney = c.policy.canSeeMoney(user);

  const house = c.farm.house(houseId);
  const batch = house.currentBatch();

  function save() {
    const quantity = parseNumber(kg);
    if (!(quantity > 0)) return setError('Enter the kg delivered.');
    const money = canSeeMoney && cost.trim() ? parseNumber(cost) : null;
    const r = run(() => c.feed.recordDelivery(houseId, supplierId, quantity, money, user));
    if (r) {
      setResult(r);
      setKg('');
      setCost('');
      refresh();
    }
  }

  return (
    <Screen title="Feed delivery" subtitle="FR-02 · supplier → house → batch">
      <div className="field">
        <label>House</label>
        <HousePicker value={houseId} onChange={(id) => { setHouseId(id); setResult(null); }} />
        {batch && (
          <span className="hint">
            Goes to {house.getName()}'s open batch: placed {dayMonth(batch.getStartDate())}, day {batch.ageInDays()}, {num(batch.getChicksPlaced())} chicks.
          </span>
        )}
      </div>

      <div className="field">
        <label>Supplier</label>
        {suppliers.length === 0 && <span className="hint">No feed suppliers. The Director adds them in Settings.</span>}
        <div className="list-pick">
          {suppliers.map((s) => (
            <div key={s.getId()} className="seg">
              <button className={supplierId === s.getId() ? 'on' : ''} onClick={() => setSupplierId(s.getId())}>
                {s.getName()}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="kg">Quantity (kg)</label>
        <input id="kg" className="input" inputMode="numeric" placeholder="e.g. 2000" value={kg} onChange={(e) => setKg(e.target.value)} />
      </div>

      {canSeeMoney ? (
        <div className="field">
          <label htmlFor="cost">Cost (UZS)</label>
          <input id="cost" className="input" inputMode="numeric" placeholder="optional" value={cost} onChange={(e) => setCost(e.target.value)} />
          <span className="hint">Added to this batch's costs (FR-03).</span>
        </div>
      ) : (
        <p className="small muted">The cost is entered by the Director (NFR-03).</p>
      )}

      <button className="btn btn-primary btn-huge" onClick={save} disabled={!batch}>
        Save delivery
      </button>

      <ErrorNotice error={error} />
      {result && (
        <Notice kind="ok" title="Delivery saved">
          {num(result.delivery.getQuantityKg())} kg from {result.delivery.getSupplier().getName()} → {house.getName()}.
          <br />
          Feed per bird in this batch so far: <b>{num(result.feedPerBirdKg, 2)} kg</b>
        </Notice>
      )}

      {batch && (
        <div className="card">
          <h2>Deliveries to this batch</h2>
          <div className="lines">
            {c.feed.deliveriesFor(batch.getId()).map((d) => (
              <div key={d.getId()} className="line">
                <span className="l">
                  {dayMonth(d.getDate())} · {d.getSupplier().getName()}
                  {canSeeMoney && <div className="tiny muted">{d.hasCost() ? uzs(d.getCost()!) : 'cost not entered'}</div>}
                </span>
                <span className="r">{num(d.getQuantityKg())} kg</span>
              </div>
            ))}
          </div>
          <div className="row small" style={{ marginTop: 8 }}>
            <span className="muted">Feed per bird</span>
            <b>{num(c.feed.feedPerBird(batch), 2)} kg</b>
          </div>
        </div>
      )}
    </Screen>
  );
}
