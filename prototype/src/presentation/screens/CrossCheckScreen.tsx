import { useState } from 'react';
import { BazaarAgent } from '../../domain/finance/Buyer';
import { SESSION_KIND_LABEL } from '../../domain/slaughter/SlaughterSession';
import { CrossCheckStatus } from '../../domain/slaughter/WeightTally';
import { useUser } from '../AppContext';
import { ErrorNotice, Notice } from '../components/Notice';
import { Screen } from '../components/Screen';
import { dayMonth, num, parseNumber, uzs } from '../format';
import { useAction } from '../useAction';

const STATUS_TEXT: Record<CrossCheckStatus, string> = {
  [CrossCheckStatus.PENDING]: 'Waiting for the second figure. No sale is calculated from one unconfirmed total.',
  [CrossCheckStatus.MATCH]: 'Both figures agree. The sale can be recorded.',
  [CrossCheckStatus.MISMATCH]: 'The figures differ. Resolve it with the agent before recording the sale.',
};

/** FR-05: the Bazaar Agent's total vs the Trusted Representative's tally for the same session. */
export function CrossCheckScreen({ sessionId }: { sessionId?: string }) {
  const { c, user, refresh } = useUser();
  const sessions = c.slaughter.allSessions();
  const firstOpen = sessions.find((s) => !s.isSold()) ?? sessions[0];
  const [selectedId, setSelectedId] = useState(sessionId ?? firstOpen?.getId() ?? '');
  const [agent, setAgent] = useState('');
  const [rep, setRep] = useState('');
  const [price, setPrice] = useState(String(c.demo.defaults.pricePerKg['Bazaar Agent']));
  const [sold, setSold] = useState<string | null>(null);
  const { error, run } = useAction();

  const session = sessions.find((s) => s.getId() === selectedId);
  if (!session) {
    return (
      <Screen title="Agent cross-check" subtitle="FR-05">
        <p className="muted">No slaughter sessions yet. Start one on the Slaughter screen.</p>
      </Screen>
    );
  }
  const tally = session.getTally();
  const status = tally.status();
  const houseName = c.farm.houseOfBatch(session.getBatchId())?.getName() ?? '';

  function saveAgent() {
    if (run(() => c.crossCheck.enterAgentKg(session!.getId(), parseNumber(agent), user)) !== undefined) {
      setAgent('');
      refresh();
    }
  }

  function saveRep() {
    if (run(() => c.crossCheck.enterRepresentativeKg(session!.getId(), parseNumber(rep), user)) !== undefined) {
      setRep('');
      refresh();
    }
  }

  function undoSale() {
    if (!window.confirm('Undo this sale? It is removed from the batch profit; the weights stay.')) return;
    if (run(() => (c.crossCheck.undoSale(session!.getId(), user), true))) {
      setSold(null);
      refresh();
    }
  }

  function recordSale() {
    const sale = run(() => c.crossCheck.recordSale(session!.getId(), new BazaarAgent('Bazaar Agent (Navoi bazaar)'), parseNumber(price), user));
    if (sale) {
      setSold(`${num(sale.getKg())} kg × ${num(sale.getPricePerKg())} = ${uzs(sale.getAmount())} added to ${houseName}'s batch.`);
      refresh();
    }
  }

  return (
    <Screen title="Agent cross-check" subtitle="FR-05 · Bazaar Agent vs Trusted Representative">
      <div className="field">
        <label>Session</label>
        <select className="input" value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setSold(null); }}>
          {sessions.map((s) => (
            <option key={s.getId()} value={s.getId()}>
              {c.farm.houseOfBatch(s.getBatchId())?.getName()} · {SESSION_KIND_LABEL[s.getKind()]} · {dayMonth(s.getDate())} — {s.isSold() ? 'sold' : s.getTally().status()}
            </option>
          ))}
        </select>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div>
          <span className={`chip big ${status === CrossCheckStatus.MATCH ? 'ok' : status === CrossCheckStatus.MISMATCH ? 'err' : 'warn'}`}>
            {status === CrossCheckStatus.MATCH ? '✔ MATCH' : status === CrossCheckStatus.MISMATCH ? `✖ ${num(Math.abs(tally.difference() ?? 0), 1)} kg apart` : '… PENDING'}
          </span>
        </div>
        <p className="small" style={{ marginBottom: 0 }}>{STATUS_TEXT[status]}</p>
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="agent">Agent's total (from his Telegram photo)</label>
          {tally.getAgentKg() !== undefined && <div className="big-number" style={{ fontSize: 26 }}>{num(tally.getAgentKg()!, 1)} kg</div>}
          <div className="fieldrow">
            <input id="agent" className="input" inputMode="decimal" placeholder="kg" value={agent} onChange={(e) => setAgent(e.target.value)} disabled={session.isSold()} />
            <button className="btn btn-secondary" onClick={saveAgent} disabled={session.isSold() || !agent}>
              {tally.getAgentKg() === undefined ? 'Save' : 'Replace'}
            </button>
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="rep">Trusted Representative's tally</label>
          {tally.getRepresentativeKg() !== undefined && <div className="big-number" style={{ fontSize: 26 }}>{num(tally.getRepresentativeKg()!, 1)} kg</div>}
          <div className="fieldrow">
            <input id="rep" className="input" inputMode="decimal" placeholder="kg" value={rep} onChange={(e) => setRep(e.target.value)} disabled={session.isSold()} />
            <button className="btn btn-secondary" onClick={saveRep} disabled={session.isSold() || !rep}>
              {tally.getRepresentativeKg() === undefined ? 'Save' : 'Replace'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Sale to the Bazaar Agent</h2>
        {session.isSold() ? (
          <>
            <Notice kind="ok" title="Sale recorded">{sold ?? `This session's sale is in ${houseName}'s batch profit.`}</Notice>
            <button className="btn btn-danger" style={{ marginTop: 10 }} onClick={undoSale}>
              Undo sale
            </button>
            <p className="tiny muted">Undo removes the sale from the batch profit so the weights or price can be corrected and the sale recorded again.</p>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="price">Today's bazaar rate (UZS per kg)</label>
              <input id="price" className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            {status === CrossCheckStatus.MATCH && (
              <p className="small">
                {num(tally.confirmedKg(), 1)} kg × {num(parseNumber(price) || 0)} = <b>{uzs(tally.confirmedKg() * (parseNumber(price) || 0))}</b>
              </p>
            )}
            <button className="btn btn-primary btn-huge" style={{ marginTop: 8 }} onClick={recordSale} disabled={status !== CrossCheckStatus.MATCH}>
              Record sale
            </button>
            {status !== CrossCheckStatus.MATCH && <p className="tiny muted">Enabled only when both figures match.</p>}
          </>
        )}
      </div>
      <ErrorNotice error={error} />
    </Screen>
  );
}
