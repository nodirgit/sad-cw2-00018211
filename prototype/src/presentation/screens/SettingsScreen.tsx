import { useState } from 'react';
import { ThresholdRange } from '../../domain/environment/ThresholdRange';
import type { House } from '../../domain/farm/House';
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
  const [added, setAdded] = useState<string | null>(null);
  const { error, run } = useAction();

  function addHouse() {
    const h = run(() => c.farm.addHouse(name, parseNumber(capacity), user));
    if (h) {
      setAdded(`${h.getName()} added. Start a batch for it below.`);
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
        {added && <div style={{ marginTop: 10 }}><Notice kind="ok">{added}</Notice></div>}
      </div>
      <ErrorNotice error={error} />

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
  const [msg, setMsg] = useState<string | null>(null);
  const { error, run } = useAction();
  const batch = house.currentBatch();

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
      <div className="row">
        <h2 style={{ margin: 0 }}>{house.getName()}</h2>
        <span className="muted small">capacity {num(house.getCapacity())}</span>
      </div>
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
      <ErrorNotice error={error} />
      {msg && !error && <div style={{ marginTop: 10 }}><Notice kind="ok">{msg}</Notice></div>}
    </div>
  );
}
