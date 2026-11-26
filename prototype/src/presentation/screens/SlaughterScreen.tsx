import { useState } from 'react';
import { SESSION_KIND_LABEL, SessionKind, SlaughterSession } from '../../domain/slaughter/SlaughterSession';
import { CrossCheckStatus } from '../../domain/slaughter/WeightTally';
import { useUser } from '../AppContext';
import { HousePicker, useDefaultHouse } from '../components/HousePicker';
import { ErrorNotice, Notice } from '../components/Notice';
import { Screen } from '../components/Screen';
import { dayMonth, num, parseNumber, time, uzs } from '../format';
import { useAction } from '../useAction';

function CrossCheckChip({ status, sold }: { status: CrossCheckStatus; sold: boolean }) {
  if (sold) return <span className="chip ok">sold</span>;
  const kind = status === CrossCheckStatus.MATCH ? 'ok' : status === CrossCheckStatus.MISMATCH ? 'err' : 'warn';
  return <span className={`chip ${kind}`}>weights {status.toLowerCase()}</span>;
}

/** FR-04 + NFR-04: write the crew's head count down and show their pay before they leave. */
export function SlaughterScreen() {
  const { c, user, refresh, go } = useUser();
  const [houseId, setHouseId] = useState(useDefaultHouse());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kind, setKind] = useState<SessionKind>(SessionKind.THINNING);
  const [count, setCount] = useState('');
  const [rate, setRate] = useState(String(c.demo.defaults.crewRatePerHead));
  const [newCount, setNewCount] = useState('');
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<number | null>(null);
  const { error, setError, run } = useAction();

  const batch = c.farm.house(houseId).currentBatch();
  const sessions = batch ? c.slaughter.sessionsForBatch(batch.getId()) : [];
  const selected: SlaughterSession | undefined = sessions.find((s) => s.getId() === selectedId);
  const hc = selected?.getHeadCount() ?? null;

  function pick(id: string | null) {
    setSelectedId(id);
    setPayment(null);
    setError(null);
    setCount('');
    setNewCount('');
    setNote('');
  }

  function startSession() {
    const s = run(() => c.slaughter.startSession(houseId, kind, user));
    if (s) {
      pick(s.getId());
      refresh();
    }
  }

  function recordCount() {
    if (!selected) return;
    const pay = run(() => c.slaughter.recordHeadCount(selected.getId(), parseNumber(count), parseNumber(rate), user));
    if (pay !== undefined) {
      setPayment(pay);
      refresh();
    }
  }

  function correct() {
    if (!selected) return;
    const pay = run(() => c.slaughter.correctHeadCount(selected.getId(), parseNumber(newCount), note, user));
    if (pay !== undefined) {
      setPayment(pay);
      setNewCount('');
      setNote('');
      refresh();
    }
  }

  return (
    <Screen title="Slaughter session" subtitle="FR-04 · NFR-04 · crew head count">
      <HousePicker value={houseId} onChange={(id) => { setHouseId(id); pick(null); }} />

      {!selected && (
        <>
          <div className="card">
            <h2>New session</h2>
            <div className="seg">
              {[SessionKind.THINNING, SessionKind.MAIN].map((k) => (
                <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                  {SESSION_KIND_LABEL[k]}
                </button>
              ))}
            </div>
            <div className="spacer" />
            <button className="btn btn-primary" onClick={startSession} disabled={!batch} style={{ marginTop: 8 }}>
              Start tonight's session
            </button>
          </div>

          <div className="section-title">Sessions in this batch</div>
          {sessions.length === 0 && <p className="muted small">No sessions yet.</p>}
          {sessions.map((s) => {
            const h = s.getHeadCount();
            return (
              <button key={s.getId()} className="card tile" style={{ minHeight: 0 }} onClick={() => pick(s.getId())}>
                <div className="row" style={{ width: '100%' }}>
                  <b>
                    {SESSION_KIND_LABEL[s.getKind()]} · {dayMonth(s.getDate())}
                  </b>
                  <CrossCheckChip status={s.getTally().status()} sold={s.isSold()} />
                </div>
                <span>{h ? `${num(h.effectiveCount())} head · crew ${uzs(h.crewPayment())}` : 'Head count not recorded yet'}</span>
              </button>
            );
          })}
        </>
      )}

      {selected && (
        <>
          <div className="row">
            <b>
              {SESSION_KIND_LABEL[selected.getKind()]} · {dayMonth(selected.getDate())}
            </b>
            <button className="btn btn-secondary btn-small" onClick={() => pick(null)}>
              All sessions
            </button>
          </div>

          {!hc && (
            <div className="card">
              <h2>Head count</h2>
              <div className="field">
                <label htmlFor="count">Birds slaughtered (agreed with the crew)</label>
                <input id="count" className="input" inputMode="numeric" placeholder="e.g. 1100" value={count} onChange={(e) => setCount(e.target.value)} />
              </div>
              <div className="field" style={{ marginTop: 10 }}>
                <label htmlFor="rate">Rate per head (UZS)</label>
                <input id="rate" className="input" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} />
                <span className="hint">Demo value — the real rate is set by the Director.</span>
              </div>
              <button className="btn btn-primary btn-huge" style={{ marginTop: 12 }} onClick={recordCount}>
                Record count
              </button>
            </div>
          )}

          <ErrorNotice error={error} />

          {hc && (
            <>
              <div className="card" style={{ borderLeft: '6px solid var(--green)' }}>
                <div className="muted small">Pay the crew now</div>
                <div className="big-number pos">{uzs(hc.crewPayment())}</div>
                <div className="small">
                  {num(hc.effectiveCount())} head × {num(hc.getRatePerHead())} UZS
                </div>
              </div>
              {payment !== null && <Notice kind="ok" title="Saved">Crew payment worked out on the spot (NFR-04).</Notice>}

              <div className="card">
                <h2>Count history</h2>
                <div className="lines">
                  <div className="line">
                    <span className="l">
                      Recorded · {dayMonth(hc.getRecordedAt())} {time(hc.getRecordedAt())}
                    </span>
                    <span className="r">{num(hc.getReportedCount())}</span>
                  </div>
                  {hc.getCorrections().map((corr, i) => (
                    <div key={i} className="line">
                      <span className="l">
                        Correction · {dayMonth(corr.getAt())} {time(corr.getAt())}
                        <div className="tiny muted">“{corr.getNote()}”</div>
                      </span>
                      <span className="r">{num(corr.getNewCount())}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2>Correct count</h2>
                <p className="small muted" style={{ marginTop: 0 }}>
                  A recount never overwrites: it is added with a note (FR-04).
                </p>
                <div className="fieldrow">
                  <input className="input" inputMode="numeric" placeholder="New count" value={newCount} onChange={(e) => setNewCount(e.target.value)} aria-label="New count" />
                  <input className="input" style={{ fontSize: 16 }} placeholder="Why? (required)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
                </div>
                <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={correct}>
                  Save correction
                </button>
              </div>
            </>
          )}

          <button className="btn btn-secondary" onClick={() => go({ name: 'crosscheck', sessionId: selected.getId() })}>
            Bazaar weights cross-check →
          </button>

          {!hc && !selected.isSold() && (
            <button
              className="btn btn-danger"
              onClick={() => {
                if (!window.confirm('Delete this session? Nothing has been recorded in it yet.')) return;
                if (run(() => (c.slaughter.deleteSession(selected.getId(), user), true))) {
                  pick(null);
                  refresh();
                }
              }}
            >
              Delete session
            </button>
          )}
          {hc && <p className="tiny muted">A session with a recorded head count is kept: the crew was paid (NFR-04). Correct the count with a note instead.</p>}
        </>
      )}
    </Screen>
  );
}
