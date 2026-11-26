import { useState } from 'react';
import { BUYER_GROUP_LABEL, Buyer, BuyerGroup } from '../../domain/partners/Buyer';
import { SupplierType } from '../../domain/partners/Supplier';
import type { Partner } from '../../domain/partners/Partner';
import type { PartnerDetails } from '../../domain/partners/PartnerDetails';
import type { User } from '../../domain/people/User';
import type { Container } from '../../app/container';
import { useUser } from '../AppContext';
import { ErrorNotice } from './Notice';
import { useAction } from '../useAction';

/** A partner group the Director can add a new partner to. */
export interface GroupOption {
  key: string;
  label: string;
  add: (c: Container, name: string, user: User, details?: PartnerDetails) => Partner;
}

const buyerGroup = (g: BuyerGroup): GroupOption => ({ key: g, label: BUYER_GROUP_LABEL[g], add: (c, n, u, d) => c.partners.addBuyer(n, g, u, d) });
const supplierGroup = (t: SupplierType, label: string): GroupOption => ({ key: t, label, add: (c, n, u, d) => c.partners.addSupplier(n, t, u, d) });

/** Partners we sell to. */
export const SELL_GROUPS: GroupOption[] = [BuyerGroup.BAZAAR_AGENT, BuyerGroup.RESELLER, BuyerGroup.SHOP, BuyerGroup.CLIENT].map(buyerGroup);
/** Partners we buy from. */
export const BUY_GROUPS: GroupOption[] = [supplierGroup(SupplierType.FEED, 'Feed suppliers'), supplierGroup(SupplierType.CHICKS, 'Chick suppliers')];
/** Buyers whose sales are recorded directly (the Bazaar agent's go through the cross-check, FR-05). */
export const DIRECT_SALE_GROUPS = [BuyerGroup.RESELLER, BuyerGroup.SHOP, BuyerGroup.CLIENT];

/** Pick a buyer by name from the partner list (grouped), or add a new one on the spot. */
export function BuyerPicker({ groups, value, onChange }: { groups: BuyerGroup[]; value: string; onChange: (buyer: Buyer) => void }) {
  const { c } = useUser();
  const buyers = c.partners.activeBuyers(groups);
  return (
    <>
      {buyers.length === 0 ? (
        <p className="small muted" style={{ margin: 0 }}>No partners in this list yet. Add one below.</p>
      ) : (
        <select
          className="input"
          value={value}
          onChange={(e) => {
            const b = c.partners.findBuyer(e.target.value);
            if (b) onChange(b);
          }}
          aria-label="Buyer"
        >
          {groups.map((g) => {
            const inGroup = buyers.filter((b) => b.getGroup() === g);
            return (
              inGroup.length > 0 && (
                <optgroup key={g} label={BUYER_GROUP_LABEL[g]}>
                  {inGroup.map((b) => (
                    <option key={b.getId()} value={b.getId()}>
                      {b.getName()}
                    </option>
                  ))}
                </optgroup>
              )
            );
          })}
        </select>
      )}
      <AddPartnerInline options={SELL_GROUPS.filter((o) => groups.includes(o.key as BuyerGroup))} onAdded={(p) => onChange(p as Buyer)} />
    </>
  );
}

/** "＋ New partner": name + group, saved to the partner list and picked at once (Director only). */
export function AddPartnerInline({ options, onAdded, label = '＋ New partner' }: { options: GroupOption[]; onAdded: (p: Partner) => void; label?: string }) {
  const { c, user, refresh } = useUser();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [group, setGroup] = useState(options[0]?.key ?? '');
  const { error, setError, run } = useAction();
  if (!c.policy.canSeeMoney(user) || options.length === 0) return null;

  function add() {
    const opt = options.find((o) => o.key === group) ?? options[0];
    const p = run(() => opt.add(c, name, user));
    if (p) {
      setOpen(false);
      setName('');
      onAdded(p);
      refresh();
    }
  }

  if (!open)
    return (
      <button className="linkbtn small" style={{ alignSelf: 'flex-start', color: 'var(--green)', fontWeight: 700 }} onClick={() => { setError(null); setOpen(true); }}>
        {label}
      </button>
    );

  return (
    <div className="card" style={{ background: 'var(--green-weak)', boxShadow: 'none', marginTop: 8 }}>
      <input className="input" style={{ fontSize: 17 }} placeholder="Name, e.g. Navoi market stall 4" value={name} onChange={(e) => setName(e.target.value)} aria-label="New partner name" autoFocus />
      {options.length > 1 && (
        <div className="seg" role="radiogroup" aria-label="Group" style={{ marginTop: 8 }}>
          {options.map((o) => (
            <button key={o.key} className={group === o.key ? 'on' : ''} onClick={() => setGroup(o.key)} role="radio" aria-checked={group === o.key}>
              {o.label}
            </button>
          ))}
        </div>
      )}
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={add} disabled={!name.trim()}>
          Add
        </button>
      </div>
      <ErrorNotice error={error} />
    </div>
  );
}
