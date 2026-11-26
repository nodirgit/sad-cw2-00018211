import { useState } from 'react';
import type { Buyer } from '../../domain/partners/Buyer';
import type { Sale } from '../../domain/finance/Sale';
import { useUser } from '../AppContext';
import { HousePicker, useDefaultHouse } from '../components/HousePicker';
import { ErrorNotice, Notice } from '../components/Notice';
import { BuyerPicker, DIRECT_SALE_GROUPS } from '../components/PartnerPicker';
import { EditButtons, RowActions } from '../components/RowActions';
import { Screen } from '../components/Screen';
import { dayMonth, num, parseNumber, toInputDate, uzs } from '../format';
import { useAction } from '../useAction';

/**
 * FR-03: sales to the farm's partners (resellers such as the Nurata seller, the shop, clients),
 * recorded straight to a batch. The buyer is picked by name from the partner list, or added here.
 * Bazaar agent sales are not here: they go through the weight cross-check (FR-05).
 */
export function DirectSaleScreen() {
  const { c, user, refresh } = useUser();
  // Start with the first group (resellers), not just the first name A–Z.
  const first = DIRECT_SALE_GROUPS.map((g) => c.partners.activeBuyers([g])[0]).find(Boolean);
  const [houseId, setHouseId] = useState(useDefaultHouse());
  const [buyerId, setBuyerId] = useState(first?.getId() ?? '');
  const [kg, setKg] = useState('');
  const priceFor = (b?: Buyer) => (b ? String(c.profit.lastPriceFor(b.getId(), user) ?? c.demo.defaults.pricePerKg[b.getGroup()]) : '');
  const [price, setPrice] = useState(priceFor(first));
  const [date, setDate] = useState(toInputDate(new Date()));
  const [saved, setSaved] = useState<string | null>(null);
  const { error, setError, run } = useAction();

  const buyer = c.partners.findBuyer(buyerId);
  const total = (parseNumber(kg) || 0) * (parseNumber(price) || 0);

  function pickBuyer(b: Buyer) {
    setBuyerId(b.getId());
    setPrice(priceFor(b));
  }

  function save() {
    if (!buyer) return setError('Pick the buyer, or add a new one.');
    if (!(parseNumber(kg) > 0)) return setError('Enter the kg sold.');
    const sale = run(() => c.profit.recordDirectSale(houseId, buyer, parseNumber(kg), parseNumber(price), new Date(`${date}T12:00:00`), user));
    if (sale) {
      setSaved(`${sale.describe()} = ${uzs(sale.getAmount())}, added to ${c.farm.houseOfBatch(sale.getBatchId())?.getName()}'s batch.`);
      setKg('');
      refresh();
    }
  }

  const recent = c.profit.directSales(user).slice(0, 8);

  return (
    <Screen title="Direct sale" subtitle="FR-03 · resellers, shop, clients">
      <div className="card">
        <div className="field">
          <label>Buyer</label>
          <BuyerPicker groups={DIRECT_SALE_GROUPS} value={buyerId} onChange={pickBuyer} />
          {buyer && <span className="hint">{buyer.groupLabel()} · price from {c.profit.lastPriceFor(buyer.getId(), user) !== null ? 'their last sale' : 'the usual rate'}</span>}
        </div>
        <div className="fieldrow" style={{ marginTop: 10 }}>
          <div className="field">
            <label htmlFor="kg">Kg sold</label>
            <input id="kg" className="input" inputMode="decimal" placeholder="e.g. 150" value={kg} onChange={(e) => setKg(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ppk">UZS per kg</label>
            <input id="ppk" className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="sdate">Date</label>
          <input id="sdate" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label>House (batch the birds came from)</label>
          <HousePicker value={houseId} onChange={setHouseId} />
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <span className="muted">Total</span>
          <b className="pos" style={{ fontSize: 22 }}>{uzs(total)}</b>
        </div>
        <button className="btn btn-primary btn-huge" style={{ marginTop: 10 }} onClick={save}>
          Save sale
        </button>
        <p className="tiny muted" style={{ marginBottom: 0 }}>Bazaar agent sales are recorded from the agent cross-check (FR-05).</p>
      </div>

      <ErrorNotice error={error} />
      {saved && <Notice kind="ok" title="Sale saved">{saved}</Notice>}

      <div className="card">
        <h2>Recent direct sales</h2>
        {recent.length === 0 && <p className="small muted">None yet.</p>}
        {recent.map((s) => (
          <SaleRow key={s.getId()} sale={s} onChanged={() => setSaved(null)} />
        ))}
      </div>
    </Screen>
  );
}

function SaleRow({ sale, onChanged }: { sale: Sale; onChanged: () => void }) {
  const { c, user, refresh } = useUser();
  const [editing, setEditing] = useState(false);
  const [kg, setKg] = useState('');
  const [price, setPrice] = useState('');
  const { error, setError, run } = useAction();

  function save() {
    if (run(() => c.profit.editDirectSale(sale.getId(), parseNumber(kg), parseNumber(price), user))) {
      setEditing(false);
      onChanged();
      refresh();
    }
  }

  function remove() {
    if (run(() => (c.profit.deleteEntry(sale.getId(), user), true))) {
      onChanged();
      refresh();
    }
  }

  return (
    <div className="rec">
      <div className="top">
        <div className="main">
          {sale.getBuyer().getName()}
          <div className="tiny muted">
            {sale.getBuyer().groupLabel()} · {dayMonth(sale.getDate())} · {c.farm.houseOfBatch(sale.getBatchId())?.getName() ?? 'removed house'} · {num(sale.getKg(), 1)} kg × {num(sale.getPricePerKg())}
          </div>
        </div>
        <span className="val pos">{uzs(sale.getAmount())}</span>
      </div>
      {editing ? (
        <>
          <div className="fieldrow" style={{ marginTop: 8 }}>
            <input className="input" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="kg" aria-label="Kg" />
            <input className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="UZS per kg" aria-label="Price per kg" />
          </div>
          <EditButtons onCancel={() => { setEditing(false); setError(null); }} onSave={save} saveDisabled={!kg || !price} />
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <RowActions
            onEdit={() => { setKg(String(sale.getKg())); setPrice(String(sale.getPricePerKg())); setError(null); setEditing(true); }}
            onDelete={remove}
            confirmText={`Delete the sale to ${sale.getBuyer().getName()}, ${uzs(sale.getAmount())}?`}
          />
        </div>
      )}
      <ErrorNotice error={error} />
    </div>
  );
}
