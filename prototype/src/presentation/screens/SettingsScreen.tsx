import { useState } from 'react';
import { ThresholdRange } from '../../domain/environment/ThresholdRange';
import type { House } from '../../domain/farm/House';
import { SUPPLIER_TYPE_LABEL, Supplier, SupplierType } from '../../domain/feed/Supplier';
import { useUser } from '../AppContext';
import { ErrorNotice, Notice } from '../components/Notice';
import { Screen } from '../components/Screen';
import { dayMonth, num, parseNumber } from '../format';
import { useAction } from '../useAction';

/** Director settings: normal ranges (FR-07), houses by configuration (NFR-05), demo data. */
export function SettingsScreen() {
  const { c, user, refresh } = useUser();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [added, setAdded] = useState<{ houseId: string; text: string } | null>(null);
  const { error, run } = useAction();

  function addHouse() {
    const h = run(() => c.farm.addHouse(name, parseNumber(capacity), user));
    if (h) {
      setAdded({ houseId: h.getId(), text: `${h.getName()} added. Start a batch for it above.` });
      setName('');
      setCapacity('');
      refresh();
    }
  }

  function resetDemo() {
    if (window.confirm('Delete everything entered and load the demo farm again?')) {
      c.demo.reset();
      window.location.reload();
    }
  }

  return (
    <Screen title="Settings" subtitle="Director only">
      <div className="section-title">Houses</div>
      {c.farm.houses().map((h) => (
        <HouseSettings key={h.getId()} house={h} />
      ))}

      <div className="card">
        <h2>Add a house</h2>
        <p className="small muted" style={{ marginTop: 0 }}>
          A new house is configuration — name and capacity — not a code change (NFR-05).
        </p>
        <div className="fieldrow">
          <input className="input" style={{ fontSize: 17 }} placeholder="Name, e.g. House 3" value={name} onChange={(e) => setName(e.target.value)} aria-label="House name" />
          <input className="input" style={{ fontSize: 17 }} inputMode="numeric" placeholder="Capacity" value={capacity} onChange={(e) => setCapacity(e.target.value)} aria-label="Capacity" />
        </div>
        <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={addHouse} disabled={!name.trim() || !capacity}>
          Add house
        </button>
        {added && c.farm.houses().some((h) => h.getId() === added.houseId) && <div style={{ marginTop: 10 }}><Notice kind="ok">{added.text}</Notice></div>}
      </div>
      <ErrorNotice error={error} />

      <div className="section-title">Suppliers</div>
      <SupplierSettings />

      <div className="card">
        <h2>Demo data</h2>
        <p className="small" style={{ marginTop: 0 }}>
          This prototype starts with a <b>demo</b> farm. Names, houses, buyers and buyer prices (~26,000 / 27,000 / 28,000 UZS per kg) follow the case. These are
          <b> invented demo values</b>: supplier names, chick price (6,000), feed price (6,500 per kg), crew rate ({num(c.demo.defaults.crewRatePerHead)} per head), client price, all
          counts and kg, and the PINs. Sensors and the light relay are simulated.
        </p>
        <button className="btn btn-warn" onClick={resetDemo}>
          Reset demo data
        </button>
      </div>
    </Screen>
  );
}

function HouseSettings({ house }: { house: House }) {
  const { c, user, refresh } = useUser();
  const r = house.getThresholds();
  const [vals, setVals] = useState([r.getMinTempC(), r.getMaxTempC(), r.getMinHumidityPct(), r.getMaxHumidityPct()].map(String));
  const [chicks, setChicks] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(house.getName());
  const [editCapacity, setEditCapacity] = useState(String(house.getCapacity()));
  const [msg, setMsg] = useState<string | null>(null);
  const { error, setError, run } = useAction();
  const batch = house.currentBatch();

  function openEdit() {
    setEditName(house.getName());
    setEditCapacity(String(house.getCapacity()));
    setMsg(null);
    setError(null);
    setEditing(true);
  }

  function saveEdit() {
    const h = run(() => c.farm.editHouse(house.getId(), editName, parseNumber(editCapacity), user));
    if (h) {
      setEditing(false);
      setMsg(`Saved: ${h.getName()}, capacity ${num(h.getCapacity())}.`);
      refresh();
    }
  }

  function closeBatch() {
    if (!batch) return;
    if (!window.confirm(`Close the batch in ${house.getName()}? It stops taking new records; its history is kept.`)) return;
    const ok = run(() => {
      c.farm.closeBatch(house.getId(), user);
      return true;
    });
    if (ok) {
      setMsg('Batch closed. You can start a new batch or delete the house.');
      refresh();
    }
  }

  function deleteHouse() {
    if (!window.confirm(`Delete ${house.getName()}? This cannot be undone.`)) return;
    const ok = run(() => {
      c.farm.removeHouse(house.getId(), user);
      return true;
    });
    if (ok) refresh();
  }

  function saveRange() {
    const [a, b, h1, h2] = vals.map(Number);
    const ok = run(() => {
      c.farm.setThresholds(house.getId(), new ThresholdRange(a, b, h1, h2), user);
      return true;
    });
    if (ok) {
      setMsg('Range saved. Readings outside it are flagged on the home screen.');
      refresh();
    }
  }

  function startBatch() {
    const b = run(() => c.farm.startBatch(house.getId(), parseNumber(chicks), new Date(), user));
    if (b) {
      setMsg(`Batch started: ${num(b.getChicksPlaced())} chicks.`);
      setChicks('');
      refresh();
    }
  }

  const labels = ['Min °C', 'Max °C', 'Min humidity %', 'Max humidity %'];
  return (
    <div className="card">
      {editing ? (
        <>
          <h2>Edit house</h2>
          <div className="fieldrow">
            <div className="field">
              <label className="tiny">Name</label>
              <input className="input" style={{ fontSize: 17 }} value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="House name" />
            </div>
            <div className="field">
              <label className="tiny">Capacity</label>
              <input className="input" style={{ fontSize: 17 }} inputMode="numeric" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} aria-label="Capacity" />
            </div>
          </div>
          <div className="fieldrow" style={{ marginTop: 10 }}>
            <button className="btn btn-secondary" onClick={() => { setEditing(false); setError(null); }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveEdit} disabled={!editName.trim() || !editCapacity}>
              Save
            </button>
          </div>
        </>
      ) : (
        <div className="row">
          <div>
            <h2 style={{ margin: 0 }}>{house.getName()}</h2>
            <span className="muted small">capacity {num(house.getCapacity())}</span>
          </div>
          <button className="btn btn-secondary btn-small" onClick={openEdit}>
            Edit
          </button>
        </div>
      )}
      <p className="small muted">{batch ? `Open batch: placed ${dayMonth(batch.getStartDate())}, ${num(batch.getChicksPlaced())} chicks, day ${batch.ageInDays()}.` : 'No open batch.'}</p>

      <h3>Normal range (FR-07)</h3>
      <div className="fieldrow">
        {labels.map((l, i) => (
          <div key={l} className="field">
            <label className="tiny">{l}</label>
            <input className="input" inputMode="decimal" value={vals[i]} onChange={(e) => setVals(vals.map((v, j) => (j === i ? e.target.value : v)))} />
          </div>
        ))}
      </div>
      <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={saveRange}>
        Save range
      </button>

      {batch && (
        <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={closeBatch}>
          Close batch
        </button>
      )}

      {!batch && (
        <>
          <h3>Start a batch</h3>
          <div className="fieldrow">
            <input className="input" inputMode="numeric" placeholder="Chicks placed" value={chicks} onChange={(e) => setChicks(e.target.value)} aria-label="Chicks placed" />
            <button className="btn btn-primary" onClick={startBatch} disabled={!chicks}>
              Start
            </button>
          </div>
        </>
      )}
      <button className="btn btn-danger" style={{ marginTop: 14 }} onClick={deleteHouse} disabled={!!batch || c.farm.houses().length === 1}>
        Delete house
      </button>
      {batch && <p className="tiny muted" style={{ margin: '6px 2px 0' }}>To delete this house, close its batch first.</p>}
      <ErrorNotice error={error} />
      {msg && !error && <div style={{ marginTop: 10 }}><Notice kind="ok">{msg}</Notice></div>}
    </div>
  );
}

/** NFR-05: the Director keeps the chick and feed supplier list up to date. */
function SupplierSettings() {
  const { c, user, refresh } = useUser();
  const [name, setName] = useState('');
  const [type, setType] = useState<SupplierType>(SupplierType.FEED);
  const { error, run } = useAction();
  const suppliers = c.suppliers.activeSuppliers();

  function add() {
    const s = run(() => c.suppliers.addSupplier(name, type, user));
    if (s) {
      setName('');
      refresh();
    }
  }

  return (
    <div className="card">
      <h2>Suppliers</h2>
      {suppliers.length === 0 && <p className="small muted">No suppliers yet.</p>}
      <div className="lines">
        {suppliers.map((s) => (
          <SupplierRow key={s.getId()} supplier={s} />
        ))}
      </div>

      <h3>Add a supplier</h3>
      <input className="input" style={{ fontSize: 17 }} placeholder="Supplier name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Supplier name" />
      <div className="seg" role="radiogroup" aria-label="Supplier type" style={{ marginTop: 8 }}>
        {[SupplierType.FEED, SupplierType.CHICKS].map((t) => (
          <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)} role="radio" aria-checked={type === t}>
            {SUPPLIER_TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={add} disabled={!name.trim()}>
        Add supplier
      </button>
      <ErrorNotice error={error} />
    </div>
  );
}

function SupplierRow({ supplier }: { supplier: Supplier }) {
  const { c, user, refresh } = useUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(supplier.getName());
  const { error, setError, run } = useAction();

  function save() {
    const s = run(() => c.suppliers.renameSupplier(supplier.getId(), name, user));
    if (s) {
      setEditing(false);
      refresh();
    }
  }

  function remove() {
    if (!window.confirm(`Remove ${supplier.getName()} from the supplier list? Past deliveries keep its name.`)) return;
    const ok = run(() => {
      c.suppliers.removeSupplier(supplier.getId(), user);
      return true;
    });
    if (ok) refresh();
  }

  if (editing) {
    return (
      <div style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
        <input className="input" style={{ fontSize: 17 }} value={name} onChange={(e) => setName(e.target.value)} aria-label="Supplier name" />
        <div className="fieldrow" style={{ marginTop: 8 }}>
          <button className="btn btn-secondary btn-small" onClick={() => { setEditing(false); setName(supplier.getName()); setError(null); }}>
            Cancel
          </button>
          <button className="btn btn-primary btn-small" onClick={save} disabled={!name.trim()}>
            Save
          </button>
        </div>
        <ErrorNotice error={error} />
      </div>
    );
  }

  return (
    <div style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
      <div className="row">
        <div style={{ minWidth: 0 }}>
          <b>{supplier.getName()}</b>{' '}
          <span className="chip grey">{SUPPLIER_TYPE_LABEL[supplier.getType()]}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-small" onClick={() => { setName(supplier.getName()); setEditing(true); }}>
            Edit
          </button>
          <button className="btn btn-danger btn-small" onClick={remove}>
            Delete
          </button>
        </div>
      </div>
      <ErrorNotice error={error} />
    </div>
  );
}
