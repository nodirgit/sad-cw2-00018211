import { useState } from 'react';
import type { Batch } from '../../domain/farm/Batch';
import type { House } from '../../domain/farm/House';
import { Expense } from '../../domain/finance/Expense';
import type { FinancialEntry } from '../../domain/finance/FinancialEntry';
import { Sale } from '../../domain/finance/Sale';
import { ErrorNotice } from '../components/Notice';
import { EditButtons, RowActions } from '../components/RowActions';
import { useUser } from '../AppContext';
import { Screen } from '../components/Screen';
import { dayMonth, num, parseNumber, uzs } from '../format';
import { useAction } from '../useAction';

function batchOf(h: House): Batch | undefined {
  return h.currentBatch() ?? h.getBatches()[h.getBatches().length - 1];
}

/** FR-03: running profit for each house's batch, from that batch's own costs and sales. Director only. */
export function BatchProfitScreen() {
  const { c, user } = useUser();
  const [showAll, setShowAll] = useState(false);
  const houses = c.farm.houses();
  const [houseId, setHouseId] = useState(houses[0]?.getId() ?? '');
  const house = c.farm.house(houseId);
  const batch = batchOf(house);
  const p = batch ? c.profit.profitFor(batch.getId(), user) : null;

  return (
    <Screen title="Batch profit" subtitle="FR-03 · each batch on its own">
      <div className="tiles">
        {houses.map((h) => {
          const b = batchOf(h);
          const hp = b ? c.profit.profitFor(b.getId(), user) : null;
          return (
            <button key={h.getId()} className="tile" onClick={() => setHouseId(h.getId())} style={h.getId() === houseId ? { outline: '3px solid var(--green)' } : undefined}>
              <b>{h.getName()}</b>
              <span>{b ? `batch day ${b.ageInDays()}` : 'no batch'}</span>
              {hp && <b className={hp.profit >= 0 ? 'pos' : 'neg'}>{uzs(hp.profit)}</b>}
            </button>
          );
        })}
      </div>

      {batch && p ? (
        <>
          <div className="card">
            <div className="muted small">
              {house.getName()} · batch placed {dayMonth(batch.getStartDate())} · {num(batch.getChicksPlaced())} chicks
            </div>
            <div className={`big-number ${p.profit >= 0 ? 'pos' : 'neg'}`}>{uzs(p.profit)}</div>
            <div className="muted small">running profit so far (sales − costs)</div>
            <div className="row" style={{ marginTop: 10 }}>
              <span>Sales</span>
              <b className="pos">{uzs(p.totalSales)}</b>
            </div>
            <div className="row">
              <span>Costs</span>
              <b className="neg">{uzs(p.totalCosts)}</b>
            </div>
          </div>

          <div className="card">
            <h2>Costs by category</h2>
            <div className="lines">
              {Object.entries(p.costsByCategory).map(([label, amount]) => (
                <div key={label} className="line">
                  <span className="l">{label}</span>
                  <span className="r">{uzs(amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Sales by buyer</h2>
            {p.salesByBuyer.length === 0 && <p className="muted small">No sales yet in this batch.</p>}
            <div className="lines">
              {p.salesByBuyer.map((s) => (
                <div key={s.buyerType} className="line">
                  <span className="l">
                    {s.buyerType}
                    <div className="tiny muted">{num(s.kg)} kg</div>
                  </span>
                  <span className="r">{uzs(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>{showAll ? 'All entries' : 'Latest entries'}</h2>
            <div>
              {(showAll ? p.entries : p.entries.slice(0, 10)).map((e) => (
                <EntryRow key={e.getId()} entry={e} />
              ))}
            </div>
            {p.entries.length > 10 && (
              <button className="btn btn-secondary btn-small" style={{ marginTop: 8, width: '100%' }} onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show fewer' : `Show all ${p.entries.length}`}
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="muted">{house.getName()} has no batch yet.</p>
      )}
    </Screen>
  );
}

/** One money entry: editable unless another record owns it (then the reason is shown). */
function EntryRow({ entry }: { entry: FinancialEntry }) {
  const { c, user, go, refresh } = useUser();
  const [editing, setEditing] = useState(false);
  const [kg, setKg] = useState('');
  const [price, setPrice] = useState('');
  const { error, setError, run } = useAction();
  const locked = c.profit.lockReason(entry);

  function edit() {
    if (entry instanceof Expense) return go({ name: 'expense', editId: entry.getId() });
    if (entry instanceof Sale) {
      setKg(String(entry.getKg()));
      setPrice(String(entry.getPricePerKg()));
      setError(null);
      setEditing(true);
    }
  }

  function saveSale() {
    if (run(() => c.profit.editDirectSale(entry.getId(), parseNumber(kg), parseNumber(price), user))) {
      setEditing(false);
      refresh();
    }
  }

  function remove() {
    if (run(() => (c.profit.deleteEntry(entry.getId(), user), true))) refresh();
  }

  return (
    <div className="rec">
      <div className="top">
        <div className="main">
          {entry.describe()}
          <div className="tiny muted">{dayMonth(entry.getDate())}</div>
        </div>
        <span className={`val ${entry.signedAmount() >= 0 ? 'pos' : 'neg'}`}>
          {entry.signedAmount() >= 0 ? '+' : '−'}
          {num(Math.abs(entry.signedAmount()))}
        </span>
      </div>
      {locked ? (
        <div className="lock">{locked}</div>
      ) : (
        !editing && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <RowActions onEdit={edit} onDelete={remove} confirmText={`Delete "${entry.describe()}"?`} />
          </div>
        )
      )}
      {editing && (
        <>
          <div className="fieldrow" style={{ marginTop: 8 }}>
            <input className="input" inputMode="decimal" value={kg} onChange={(ev) => setKg(ev.target.value)} placeholder="kg" aria-label="Kg" />
            <input className="input" inputMode="numeric" value={price} onChange={(ev) => setPrice(ev.target.value)} placeholder="UZS per kg" aria-label="Price per kg" />
          </div>
          <EditButtons onCancel={() => { setEditing(false); setError(null); }} onSave={saveSale} saveDisabled={!kg || !price} />
        </>
      )}
      <ErrorNotice error={error} />
    </div>
  );
}
