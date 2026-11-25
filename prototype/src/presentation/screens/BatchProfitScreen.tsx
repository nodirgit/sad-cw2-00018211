import { useState } from 'react';
import type { Batch } from '../../domain/farm/Batch';
import type { House } from '../../domain/farm/House';
import { EXPENSE_CATEGORY_LABEL, ExpenseCategory } from '../../domain/finance/Expense';
import { useUser } from '../AppContext';
import { Screen } from '../components/Screen';
import { dayMonth, num, uzs } from '../format';

function batchOf(h: House): Batch | undefined {
  return h.currentBatch() ?? h.getBatches()[h.getBatches().length - 1];
}

/** FR-03: running profit for each house's batch, from that batch's own costs and sales. Director only. */
export function BatchProfitScreen() {
  const { c, user } = useUser();
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
              {(Object.keys(p.costsByCategory) as ExpenseCategory[]).map((cat) => (
                <div key={cat} className="line">
                  <span className="l">{EXPENSE_CATEGORY_LABEL[cat]}</span>
                  <span className="r">{uzs(p.costsByCategory[cat] ?? 0)}</span>
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
            <h2>Latest entries</h2>
            <div className="lines">
              {p.entries.slice(0, 10).map((e) => (
                <div key={e.getId()} className="line">
                  <span className="l">
                    {e.describe()}
                    <div className="tiny muted">{dayMonth(e.getDate())}</div>
                  </span>
                  <span className={`r ${e.signedAmount() >= 0 ? 'pos' : 'neg'}`}>
                    {e.signedAmount() >= 0 ? '+' : '−'}
                    {num(Math.abs(e.signedAmount()))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="muted">{house.getName()} has no batch yet.</p>
      )}
    </Screen>
  );
}
