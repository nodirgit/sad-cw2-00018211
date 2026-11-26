import { useState } from 'react';
import type { FeedDeliveryResult } from '../../application/services/FeedService';
import type { FeedDelivery } from '../../domain/feed/FeedDelivery';
import { useUser } from '../AppContext';
import { HousePicker, useDefaultHouse } from '../components/HousePicker';
import { AddPartnerInline, BUY_GROUPS } from '../components/PartnerPicker';
import { ErrorNotice, Notice } from '../components/Notice';
import { EditButtons, RowActions } from '../components/RowActions';
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
        {suppliers.length === 0 && <span className="hint">No feed suppliers yet. The Director adds them here or in Profile → Partners.</span>}
        <div className="list-pick">
          {suppliers.map((s) => (
            <div key={s.getId()} className="seg">
              <button className={supplierId === s.getId() ? 'on' : ''} onClick={() => setSupplierId(s.getId())}>
                {s.getName()}
              </button>
            </div>
          ))}
        </div>
        <AddPartnerInline options={BUY_GROUPS.slice(0, 1)} label="＋ New feed supplier" onAdded={(p) => setSupplierId(p.getId())} />
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
          <div>
            {c.feed.deliveriesFor(batch.getId()).map((d) => (
              <DeliveryRow key={d.getId()} delivery={d} onChanged={() => setResult(null)} />
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

function DeliveryRow({ delivery, onChanged }: { delivery: FeedDelivery; onChanged: () => void }) {
  const { c, user, refresh } = useUser();
  const canSeeMoney = c.policy.canSeeMoney(user);
  const [editing, setEditing] = useState(false);
  const [supplierId, setSupplierId] = useState(delivery.getSupplier().getId());
  const [kg, setKg] = useState(String(delivery.getQuantityKg()));
  const [cost, setCost] = useState(delivery.getCost() === null ? '' : String(delivery.getCost()));
  const { error, setError, run } = useAction();
  const can = c.feed.canChange(delivery, user);

  function open() {
    setSupplierId(delivery.getSupplier().getId());
    setKg(String(delivery.getQuantityKg()));
    setCost(delivery.getCost() === null ? '' : String(delivery.getCost()));
    setError(null);
    setEditing(true);
  }

  function save() {
    const money = canSeeMoney && cost.trim() ? parseNumber(cost) : null;
    if (run(() => c.feed.editDelivery(delivery.getId(), supplierId, parseNumber(kg), money, user))) {
      setEditing(false);
      onChanged();
      refresh();
    }
  }

  function remove() {
    if (run(() => (c.feed.deleteDelivery(delivery.getId(), user), true))) {
      onChanged();
      refresh();
    }
  }

  return (
    <div className="rec">
      <div className="top">
        <div className="main">
          {dayMonth(delivery.getDate())} · {delivery.getSupplier().getName()}
          {canSeeMoney && <div className="tiny muted">{delivery.hasCost() ? uzs(delivery.getCost()!) : 'cost not entered'}</div>}
        </div>
        <span className="val">{num(delivery.getQuantityKg())} kg</span>
        {can && !editing && (
          <RowActions
            onEdit={open}
            onDelete={remove}
            confirmText={`Delete the delivery of ${num(delivery.getQuantityKg())} kg from ${delivery.getSupplier().getName()}?${delivery.hasCost() ? ' Its cost is removed from the batch too.' : ''}`}
          />
        )}
      </div>
      {!can && !canSeeMoney && delivery.hasCost() && <div className="lock">Has a cost: only the Director can change it.</div>}
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} aria-label="Supplier">
            {c.feed.suppliersFor(delivery).map((s) => (
              <option key={s.getId()} value={s.getId()}>
                {s.getName()}
              </option>
            ))}
          </select>
          <div className="fieldrow">
            <input className="input" inputMode="numeric" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="kg" aria-label="Quantity kg" />
            {canSeeMoney && <input className="input" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="cost (UZS)" aria-label="Cost" />}
          </div>
          <EditButtons onCancel={() => { setEditing(false); setError(null); }} onSave={save} saveDisabled={!kg} />
        </div>
      )}
      <ErrorNotice error={error} />
    </div>
  );
}
