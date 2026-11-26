import { useState } from 'react';
import { Buyer } from '../../domain/finance/Buyer';
import type { Partner } from '../../domain/partners/Partner';
import { PartnerDetails } from '../../domain/partners/PartnerDetails';
import { useUser } from '../AppContext';
import { MenuRow } from '../components/MenuRow';
import { ErrorNotice } from '../components/Notice';
import { BUY_GROUPS, SELL_GROUPS } from '../components/PartnerPicker';
import { Screen } from '../components/Screen';
import { useAction } from '../useAction';

/* Partners (NFR-05): one list of everyone we trade with; ＋ adds one; a row opens its details. */

const ALL_GROUPS = [...SELL_GROUPS, ...BUY_GROUPS];

export function PartnersScreen() {
  const { c, go } = useUser();
  const partners = c.partners.activePartners();
  return (
    <Screen title="Partners" subtitle="Settings · who we trade with">
      <div className="menu">
        <button className="menu-row add" onClick={() => go({ name: 'settings-partner-new' })}>
          <span className="ico" aria-hidden>
            ＋
          </span>
          <span className="txt">
            <b>Add a partner</b>
            <span>name, group, TIN and contacts</span>
          </span>
        </button>
        {partners.map((p) => (
          <MenuRow
            key={p.getId()}
            icon={p instanceof Buyer ? '🤝' : '🚚'}
            title={p.getName()}
            detail={[p.groupLabel(), p.getDetails().phone].filter(Boolean).join(' · ')}
            onClick={() => go({ name: 'settings-partner', partnerId: p.getId() })}
          />
        ))}
      </div>
      {partners.length === 0 && <p className="small muted">No partners yet.</p>}
      <p className="tiny muted">A deleted partner leaves every list; past sales and deliveries keep its name.</p>
    </Screen>
  );
}

interface Fields {
  name: string;
  tin: string;
  contactPerson: string;
  phone: string;
  address: string;
}

const fieldsOf = (p?: Partner): Fields => {
  const d = p?.getDetails();
  return { name: p?.getName() ?? '', tin: d?.tin ?? '', contactPerson: d?.contactPerson ?? '', phone: d?.phone ?? '', address: d?.address ?? '' };
};

/** Name, TIN and contact fields, shared by the add and the details screens. */
function PartnerFields({ f, set }: { f: Fields; set: (f: Fields) => void }) {
  const field = (k: keyof Fields, label: string, props: { placeholder?: string; inputMode?: 'numeric' | 'tel'; type?: string } = {}) => (
    <div className="field" style={{ marginTop: 10 }}>
      <label htmlFor={`p-${k}`}>{label}</label>
      <input id={`p-${k}`} className="input" style={{ fontSize: 17 }} value={f[k]} onChange={(e) => set({ ...f, [k]: e.target.value })} {...props} />
    </div>
  );
  return (
    <>
      {field('name', 'Name', { placeholder: 'e.g. Navoi market stall 4' })}
      {field('tin', 'TIN (optional)', { placeholder: '9 digits', inputMode: 'numeric' })}
      {field('contactPerson', 'Contact person (optional)')}
      {field('phone', 'Phone (optional)', { placeholder: '+998 90 123 45 67', inputMode: 'tel', type: 'tel' })}
      {field('address', 'Address (optional)')}
    </>
  );
}

const detailsOf = (f: Fields) => new PartnerDetails(f.tin, f.contactPerson, f.phone, f.address);

export function PartnerNewScreen() {
  const { c, user, back, refresh } = useUser();
  const [group, setGroup] = useState(SELL_GROUPS[1].key);
  const [f, setF] = useState<Fields>(fieldsOf());
  const { error, run } = useAction();

  function add() {
    const opt = ALL_GROUPS.find((o) => o.key === group)!;
    const p = run(() => opt.add(c, f.name, user, detailsOf(f)));
    if (p) {
      refresh();
      back();
    }
  }

  return (
    <Screen title="Add a partner" subtitle="Settings · Partners">
      <div className="card">
        <div className="field">
          <label>Group</label>
          <div className="seg" role="radiogroup" aria-label="Group" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridAutoFlow: 'row' }}>
            {ALL_GROUPS.map((o) => (
              <button key={o.key} className={group === o.key ? 'on' : ''} onClick={() => setGroup(o.key)} role="radio" aria-checked={group === o.key}>
                {o.label}
              </button>
            ))}
          </div>
          <span className="hint">We sell to: Bazaar agents, Resellers, Shop, Clients. We buy from: Feed and Chick suppliers.</span>
        </div>
        <PartnerFields f={f} set={setF} />
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={add} disabled={!f.name.trim()}>
          Add partner
        </button>
        <ErrorNotice error={error} />
      </div>
    </Screen>
  );
}

export function PartnerScreen({ partnerId }: { partnerId: string }) {
  const { c, user, back, refresh } = useUser();
  const partner = c.partners.findPartner(partnerId);
  const [f, setF] = useState<Fields>(fieldsOf(partner));
  const [saved, setSaved] = useState(false);
  const { error, run } = useAction();

  if (!partner || !partner.isActive()) {
    return (
      <Screen title="Partner" subtitle="Settings · Partners">
        <p className="muted">This partner was deleted.</p>
      </Screen>
    );
  }

  function save() {
    if (run(() => c.partners.updatePartner(partnerId, f.name, detailsOf(f), user))) {
      setSaved(true);
      refresh();
    }
  }

  function remove() {
    if (!window.confirm(`Delete ${partner!.getName()}? Past sales and deliveries keep its name.`)) return;
    if (run(() => (c.partners.removePartner(partnerId, user), true))) {
      refresh();
      back();
    }
  }

  return (
    <Screen title={partner.getName()} subtitle={`Partners · ${partner.groupLabel()}`}>
      <div className="card">
        <div className="row">
          <span className="muted small">Group</span>
          <span className="chip grey">{partner.groupLabel()}</span>
        </div>
        <PartnerFields f={f} set={(x) => { setF(x); setSaved(false); }} />
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={save} disabled={!f.name.trim()}>
          Save changes
        </button>
        {saved && !error && <p className="small pos" style={{ margin: '8px 0 0' }}>Saved.</p>}
        <ErrorNotice error={error} />
        <p className="tiny muted" style={{ marginBottom: 0 }}>The group cannot change: past sales depend on it (a Bazaar agent's sales are cross-checked).</p>
      </div>
      <div className="card danger-zone">
        <button className="btn btn-danger" onClick={remove}>
          Delete partner
        </button>
      </div>
    </Screen>
  );
}
