import { useUser } from '../AppContext';
import { MenuRow } from '../components/MenuRow';
import { Screen } from '../components/Screen';
import { dayMonth, num, uzs } from '../format';

/** Sales section (FR-03, FR-05): the two ways a sale is recorded, and the latest sales of all buyers. */
export function SalesScreen() {
  const { c, user, go } = useUser();
  const sales = c.profit.allSales(user);
  const waiting = c.slaughter.allSessions().filter((s) => !s.isSold()).length;
  const total = sales.reduce((sum, s) => sum + s.getAmount(), 0);

  return (
    <Screen title="Sales" subtitle="FR-03 · FR-05">
      <div className="section-title">Record a sale</div>
      <div className="menu">
        <MenuRow icon="🛒" title="Direct sale" detail="Resellers · shop · clients" onClick={() => go({ name: 'sale' })} />
        <MenuRow
          icon="⚖️"
          title="Bazaar Agent sale"
          detail={waiting > 0 ? `Weights cross-check · ${waiting} ${waiting === 1 ? 'session' : 'sessions'} not sold yet` : 'Weights cross-check (FR-05)'}
          onClick={() => go({ name: 'crosscheck' })}
        />
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>Latest sales</h2>
          <span className="small muted">
            {sales.length} · {uzs(total)}
          </span>
        </div>
        {sales.length === 0 && <p className="small muted">None yet.</p>}
        {sales.slice(0, 8).map((s) => (
          <div key={s.getId()} className="rec">
            <div className="top">
              <div className="main">
                {s.getBuyer().getName()}
                <div className="tiny muted">
                  {s.getBuyer().groupLabel()} · {dayMonth(s.getDate())} · {c.farm.houseOfBatch(s.getBatchId())?.getName() ?? 'removed house'} · {num(s.getKg(), 1)} kg × {num(s.getPricePerKg())}
                </div>
              </div>
              <span className="val pos">{uzs(s.getAmount())}</span>
            </div>
          </div>
        ))}
        <p className="tiny muted" style={{ marginBottom: 0 }}>
          A direct sale is changed on Direct sale; a Bazaar Agent sale is undone on its cross-check.
        </p>
      </div>
    </Screen>
  );
}
