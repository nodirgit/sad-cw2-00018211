import { useState } from 'react';
import { ThresholdRange } from '../../domain/environment/ThresholdRange';
import type { House } from '../../domain/farm/House';
import { SUPPLIER_TYPE_LABEL, Supplier, SupplierType } from '../../domain/feed/Supplier';
import { useUser } from '../AppContext';
import { ErrorNotice, Notice } from '../components/Notice';
import { EditButtons, RowActions } from '../components/RowActions';
import { Screen } from '../components/Screen';
import { dayMonth, num, parseNumber, toInputDate } from '../format';
import { useAction } from '../useAction';

/* Director settings, grouped like a phone's settings app: a menu, then one screen per topic. */

function MenuRow({ icon, title, detail, onClick }: { icon: string; title: string; detail: string; onClick: () => void }) {
  return (
    <button className="menu-row" onClick={onClick}>
      <span className="ico" aria-hidden>
        {icon}
      </span>
      <span className="txt">
        <b>{title}</b>
        <span>{detail}</span>
      </span>
      <span className="chev" aria-hidden>
        ›
      </span>
    </button>
  );
}

/** Settings home: the topics. */
export function SettingsScreen() {
  const { c, go } = useUser();
  const houses = c.farm.houses();
  const suppliers = c.suppliers.activeSuppliers();
  return (
    <Screen title="Settings" subtitle="Director only">
      <div className="section-title">Farm</div>
      <div className="menu">
        <MenuRow icon="🏠" title="Houses" detail={`${houses.length} ${houses.length === 1 ? 'house' : 'houses'} · batches · normal ranges`} onClick={() => go({ name: 'settings-houses' })} />
        <MenuRow icon="🚚" title="Suppliers" detail={`${suppliers.length} chick and feed suppliers`} onClick={() => go({ name: 'settings-suppliers' })} />
      </div>

      <div className="section-title">App</div>
      <div className="menu">
        <MenuRow icon="🧪" title="Demo data" detail="What is invented · reset" onClick={() => go({ name: 'settings-demo' })} />
      </div>
    </Screen>
  );
}

/* ---------------- Houses (NFR-05, FR-07) ---------------- */

/** List of houses; tap one to manage it. */
export function HousesScreen() {
  const { c, go } = useUser();
  return (
    <Screen title="Houses" subtitle="Settings · NFR-05">
      <div className="menu">
        {c.farm.houses().map((h) => {
          const b = h.currentBatch();
          return (
            <MenuRow
              key={h.getId()}
              icon="🏠"
              title={h.getName()}
              detail={`capacity ${num(h.getCapacity())} · ${b ? `batch day ${b.ageInDays()}` : 'no open batch'}`}
              onClick={() => go({ name: 'settings-house', houseId: h.getId() })}
            />
          );
        })}
        <button className="menu-row add" onClick={() => go({ name: 'settings-house-new' })}>
          <span className="ico" aria-hidden>
            ＋
          </span>
          <span className="txt">
            <b>Add a house</b>
            <span>name and capacity, no code change</span>
          </span>
        </button>
      </div>
    </Screen>
  );
}

/** Add a house, and optionally place its first batch at once. */
export function HouseNewScreen() {
  const { c, user, refresh, back } = useUser();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [chicks, setChicks] = useState('');
  const { error, run } = useAction();

  function add() {
    const h = run(() => {
      // Check the batch first, so a refused batch does not leave a half-made house behind.
      if (chicks.trim() && !(parseNumber(chicks) > 0 && parseNumber(chicks) <= parseNumber(capacity))) {
        throw new Error('Chicks placed must be above 0 and not more than the capacity.');
      }
      const house = c.farm.addHouse(name, parseNumber(capacity), user);
      if (chicks.trim()) c.farm.startBatch(house.getId(), parseNumber(chicks), new Date(), user);
      return house;
    });
    if (h) {
      refresh();
      back();
    }
  }

  return (
    <Screen title="Add a house" subtitle="Settings · Houses">
      <div className="card">
        <div className="field">
          <label htmlFor="hn">Name</label>
          <input id="hn" className="input" style={{ fontSize: 17 }} placeholder="e.g. House 3" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="hc">Capacity (birds)</label>
          <input id="hc" className="input" inputMode="numeric" placeholder="e.g. 8000" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="hb">Chicks placed today (optional)</label>
          <input id="hb" className="input" inputMode="numeric" placeholder="leave empty if the house is empty" value={chicks} onChange={(e) => setChicks(e.target.value)} />
          <span className="hint">Fill it to start the house's first batch now; you can also do it later.</span>
        </div>
        <button className="btn btn-primary btn-huge" style={{ marginTop: 12 }} onClick={add} disabled={!name.trim() || !capacity}>
          Add house
        </button>
      </div>
      <ErrorNotice error={error} />
    </Screen>
  );
}

/** One house: details, its batch, its normal range, delete. */
export function HouseSettingsScreen({ houseId }: { houseId: string }) {
  const { c } = useUser();
  const house = c.farm.houses().find((h) => h.getId() === houseId);
  if (!house) {
    return (
      <Screen title="House" subtitle="Settings · Houses">
        <p className="muted">This house no longer exists.</p>
      </Screen>
    );
  }
  return (
    <Screen title={house.getName()} subtitle="Settings · Houses">
      <div className="section-title">Details</div>
      <HouseDetails house={house} />
      <div className="section-title">Batch</div>
      <BatchSettings house={house} />
      <div className="section-title">Normal range · FR-07</div>
      <RangeSettings house={house} />
      <div className="section-title">Remove</div>
      <DeleteHouse house={house} />
    </Screen>
  );
}

function HouseDetails({ house }: { house: House }) {
  const { c, user, refresh } = useUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(house.getName());
  const [capacity, setCapacity] = useState(String(house.getCapacity()));
  const { error, setError, run } = useAction();

  function save() {
    if (run(() => c.farm.editHouse(house.getId(), name, parseNumber(capacity), user))) {
      setEditing(false);
      refresh();
    }
  }

  return (
    <div className="card">
      {editing ? (
        <>
          <div className="fieldrow">
            <div className="field">
              <label className="tiny">Name</label>
              <input className="input" style={{ fontSize: 17 }} value={name} onChange={(e) => setName(e.target.value)} aria-label="House name" />
            </div>
            <div className="field">
              <label className="tiny">Capacity</label>
              <input className="input" style={{ fontSize: 17 }} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} aria-label="Capacity" />
            </div>
          </div>
          <EditButtons onCancel={() => { setEditing(false); setError(null); }} onSave={save} saveDisabled={!name.trim() || !capacity} />
        </>
      ) : (
        <div className="row">
          <div>
            <b>{house.getName()}</b>
            <div className="small muted">capacity {num(house.getCapacity())} birds</div>
          </div>
          <button className="btn btn-secondary btn-mini" onClick={() => { setName(house.getName()); setCapacity(String(house.getCapacity())); setEditing(true); }}>
            Edit
          </button>
        </div>
      )}
      <ErrorNotice error={error} />
    </div>
  );
}

function BatchSettings({ house }: { house: House }) {
  const { c, user, refresh } = useUser();
  const batch = house.currentBatch();
  const last = house.getBatches()[house.getBatches().length - 1];
  const [editing, setEditing] = useState(false);
  const [chicks, setChicks] = useState('');
  const [start, setStart] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const { error, setError, run } = useAction();

  function openEdit() {
    if (!batch) return;
    setChicks(String(batch.getChicksPlaced()));
    setStart(toInputDate(batch.getStartDate()));
    setError(null);
    setEditing(true);
  }

  function saveEdit() {
    if (run(() => c.farm.editBatch(house.getId(), parseNumber(chicks), new Date(`${start}T08:00:00`), user))) {
      setEditing(false);
      setMsg('Batch corrected.');
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

  function close() {
    if (!window.confirm(`Close the batch in ${house.getName()}? It stops taking new records; its history is kept.`)) return;
    if (run(() => (c.farm.closeBatch(house.getId(), user), true))) {
      setMsg('Batch closed. Reopen it if this was a mistake.');
      refresh();
    }
  }

  function reopen() {
    if (run(() => c.farm.reopenBatch(house.getId(), user))) {
      setMsg('Batch reopened.');
      refresh();
    }
  }

  return (
    <div className="card">
      {batch ? (
        editing ? (
          <>
            <div className="fieldrow">
              <div className="field">
                <label className="tiny">Chicks placed</label>
                <input className="input" inputMode="numeric" value={chicks} onChange={(e) => setChicks(e.target.value)} aria-label="Chicks placed" />
              </div>
              <div className="field">
                <label className="tiny">Placed on</label>
                <input className="input" style={{ fontSize: 16 }} type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Placed on" />
              </div>
            </div>
            <EditButtons onCancel={() => { setEditing(false); setError(null); }} onSave={saveEdit} saveDisabled={!chicks || !start} />
          </>
        ) : (
          <>
            <div className="row">
              <div>
                <b>Open batch · day {batch.ageInDays()}</b>
                <div className="small muted">
                  placed {dayMonth(batch.getStartDate())} · {num(batch.getChicksPlaced())} chicks
                </div>
              </div>
              <button className="btn btn-secondary btn-mini" onClick={openEdit}>
                Edit
              </button>
            </div>
            <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={close}>
              Close batch
            </button>
          </>
        )
      ) : (
        <>
          <p className="small muted" style={{ marginTop: 0 }}>No open batch.</p>
          <div className="fieldrow">
            <input className="input" inputMode="numeric" placeholder="Chicks placed" value={chicks} onChange={(e) => setChicks(e.target.value)} aria-label="Chicks placed" />
            <button className="btn btn-primary" onClick={startBatch} disabled={!chicks}>
              Start batch
            </button>
          </div>
          {last && (
            <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={reopen}>
              Reopen last batch ({dayMonth(last.getStartDate())})
            </button>
          )}
        </>
      )}
      <ErrorNotice error={error} />
      {msg && !error && <div style={{ marginTop: 10 }}><Notice kind="ok">{msg}</Notice></div>}
    </div>
  );
}

function RangeSettings({ house }: { house: House }) {
  const { c, user, refresh } = useUser();
  const r = house.getThresholds();
  const [vals, setVals] = useState([r.getMinTempC(), r.getMaxTempC(), r.getMinHumidityPct(), r.getMaxHumidityPct()].map(String));
  const [msg, setMsg] = useState<string | null>(null);
  const { error, run } = useAction();

  function save() {
    const [a, b, h1, h2] = vals.map(Number);
    if (run(() => (c.farm.setThresholds(house.getId(), new ThresholdRange(a, b, h1, h2), user), true))) {
      setMsg('Range saved. Readings outside it are flagged on the home screen.');
      refresh();
    }
  }

  const labels = ['Min °C', 'Max °C', 'Min humidity %', 'Max humidity %'];
  return (
    <div className="card">
      <div className="fieldrow">
        {labels.map((l, i) => (
          <div key={l} className="field">
            <label className="tiny">{l}</label>
            <input className="input" inputMode="decimal" value={vals[i]} onChange={(e) => setVals(vals.map((v, j) => (j === i ? e.target.value : v)))} />
          </div>
        ))}
      </div>
      <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={save}>
        Save range
      </button>
      <ErrorNotice error={error} />
      {msg && !error && <div style={{ marginTop: 10 }}><Notice kind="ok">{msg}</Notice></div>}
    </div>
  );
}

function DeleteHouse({ house }: { house: House }) {
  const { c, user, refresh, back } = useUser();
  const { error, run } = useAction();
  const blocked = house.currentBatch() ? 'Close its batch first.' : c.farm.houses().length === 1 ? 'The farm needs at least one house.' : null;

  function remove() {
    if (!window.confirm(`Delete ${house.getName()}? This cannot be undone.`)) return;
    if (run(() => (c.farm.removeHouse(house.getId(), user), true))) {
      refresh();
      back();
    }
  }

  return (
    <div className="card danger-zone">
      <button className="btn btn-danger" onClick={remove} disabled={blocked !== null}>
        Delete house
      </button>
      {blocked && <p className="tiny muted" style={{ margin: '6px 2px 0' }}>{blocked}</p>}
      <ErrorNotice error={error} />
    </div>
  );
}

/* ---------------- Suppliers (NFR-05) ---------------- */

export function SuppliersScreen() {
  const { c, user, refresh } = useUser();
  const [name, setName] = useState('');
  const [type, setType] = useState<SupplierType>(SupplierType.FEED);
  const [msg, setMsg] = useState<string | null>(null);
  const { error, run } = useAction();

  function add() {
    const s = run(() => c.suppliers.addSupplier(name, type, user));
    if (s) {
      setMsg(`${s.getName()} added.`);
      setName('');
      refresh();
    }
  }

  return (
    <Screen title="Suppliers" subtitle="Settings · NFR-05">
      {[SupplierType.FEED, SupplierType.CHICKS].map((t) => {
        const list = c.suppliers.activeSuppliers(t);
        return (
          <div key={t}>
            <div className="section-title">{SUPPLIER_TYPE_LABEL[t]} suppliers</div>
            <div className="card" style={{ marginTop: 10 }}>
              {list.length === 0 && <p className="small muted" style={{ margin: 0 }}>None.</p>}
              {list.map((s) => (
                <SupplierRow key={s.getId()} supplier={s} />
              ))}
            </div>
          </div>
        );
      })}

      <div className="section-title">Add a supplier</div>
      <div className="card">
        <input className="input" style={{ fontSize: 17 }} placeholder="Supplier name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Supplier name" />
        <div className="seg" role="radiogroup" aria-label="Supplier type" style={{ marginTop: 8 }}>
          {[SupplierType.FEED, SupplierType.CHICKS].map((t) => (
            <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)} role="radio" aria-checked={type === t}>
              {SUPPLIER_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={add} disabled={!name.trim()}>
          Add supplier
        </button>
        <ErrorNotice error={error} />
        {msg && !error && <div style={{ marginTop: 10 }}><Notice kind="ok">{msg}</Notice></div>}
      </div>
      <p className="tiny muted">A deleted supplier leaves every list; past deliveries still show its name.</p>
    </Screen>
  );
}

function SupplierRow({ supplier }: { supplier: Supplier }) {
  const { c, user, refresh } = useUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(supplier.getName());
  const { error, setError, run } = useAction();

  function save() {
    if (run(() => c.suppliers.renameSupplier(supplier.getId(), name, user))) {
      setEditing(false);
      refresh();
    }
  }

  function remove() {
    if (run(() => (c.suppliers.removeSupplier(supplier.getId(), user), true))) refresh();
  }

  return (
    <div className="rec">
      {editing ? (
        <>
          <input className="input" style={{ fontSize: 17 }} value={name} onChange={(e) => setName(e.target.value)} aria-label="Supplier name" />
          <EditButtons onCancel={() => { setEditing(false); setName(supplier.getName()); setError(null); }} onSave={save} saveDisabled={!name.trim()} />
        </>
      ) : (
        <div className="top">
          <div className="main">
            <b>{supplier.getName()}</b>
          </div>
          <RowActions
            onEdit={() => { setName(supplier.getName()); setEditing(true); }}
            onDelete={remove}
            confirmText={`Remove ${supplier.getName()} from the supplier list? Past deliveries keep its name.`}
          />
        </div>
      )}
      <ErrorNotice error={error} />
    </div>
  );
}

/* ---------------- Demo data ---------------- */

export function DemoDataScreen() {
  const { c } = useUser();

  function resetDemo() {
    if (window.confirm('Delete everything entered and load the demo farm again?')) {
      c.demo.reset();
      window.location.reload();
    }
  }

  return (
    <Screen title="Demo data" subtitle="Settings · App">
      <div className="card">
        <p className="small" style={{ marginTop: 0 }}>
          This prototype starts with a <b>demo</b> farm. Names, houses, buyers and buyer prices (~26,000 / 27,000 / 28,000 UZS per kg) follow the case. These are
          <b> invented demo values</b>: supplier names, chick price (6,000), feed price (6,500 per kg), crew rate ({num(c.demo.defaults.crewRatePerHead)} per head), client price, all
          counts and kg, and the PINs. Sensors and the light relay are simulated.
        </p>
      </div>
      <div className="card danger-zone">
        <button className="btn btn-warn" onClick={resetDemo}>
          Reset demo data
        </button>
        <p className="tiny muted" style={{ margin: '6px 2px 0' }}>Deletes everything entered and loads the demo farm again.</p>
      </div>
    </Screen>
  );
}
