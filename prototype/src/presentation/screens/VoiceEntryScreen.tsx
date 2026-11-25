import { useState } from 'react';
import type { Expense } from '../../domain/finance/Expense';
import { EXPENSE_CATEGORY_LABEL, ExpenseCategory } from '../../domain/finance/Expense';
import type { ParsedEntry } from '../../domain/voice/ParsedEntry';
import { useUser } from '../AppContext';
import { HousePicker, useDefaultHouse } from '../components/HousePicker';
import { ErrorNotice, Notice } from '../components/Notice';
import { Screen } from '../components/Screen';
import { dayMonth, parseNumber, toInputDate, uzs } from '../format';
import { useAction } from '../useAction';

const EXAMPLES = ['Kecha veterinarga 150 ming, dori uchun', 'Bugun 2-xona haydovchiga 200 ming', 'Paid 85 thousand for electricity today', 'Bir narsa oldim'];

type FieldName = 'amount' | 'date' | 'category' | 'reason';

interface Form {
  amount: string;
  date: string;
  category: string;
  reason: string;
}

/** FR-06: say a small cost → the parser fills the fields → anything unsure is confirmed by hand. */
export function VoiceEntryScreen() {
  const { c, user, refresh } = useUser();
  const defaultHouse = useDefaultHouse();
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [parsed, setParsed] = useState<ParsedEntry | null>(null);
  const [form, setForm] = useState<Form>({ amount: '', date: '', category: '', reason: '' });
  const [houseId, setHouseId] = useState(defaultHouse);
  const [confirmed, setConfirmed] = useState<Set<FieldName>>(new Set());
  const [saved, setSaved] = useState<Expense | null>(null);
  const { error, setError, run } = useAction();

  const flagged = (parsed?.flaggedFields() ?? []) as FieldName[];
  const allConfirmed = flagged.every((f) => confirmed.has(f));

  function read(utterance: string) {
    setSaved(null);
    const entry = run(() => c.voice.parse(utterance));
    if (!entry) return;
    setParsed(entry);
    setConfirmed(new Set());
    const d = entry.getDate().getValue();
    setForm({
      amount: entry.getAmount().getValue() !== null ? String(entry.getAmount().getValue()) : '',
      date: d ? toInputDate(d) : '',
      category: entry.getCategory().getValue() ?? '',
      reason: entry.getReason().getValue() ?? '',
    });
    const n = entry.getHouseNumber().getValue();
    const spokenHouse = n !== null ? c.farm.houses()[n - 1] : undefined;
    setHouseId(spokenHouse?.currentBatch() ? spokenHouse.getId() : defaultHouse);
  }

  function speak() {
    setListening(true);
    setError(null);
    c.speech
      .listen()
      .then((t) => {
        setText(t);
        read(t);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setListening(false));
  }

  function save() {
    const exp = run(() =>
      c.voice.confirm(
        {
          houseId,
          amount: form.amount ? parseNumber(form.amount) : null,
          date: form.date ? new Date(`${form.date}T12:00:00`) : null,
          category: (form.category as ExpenseCategory) || null,
          reason: form.reason,
        },
        user,
      ),
    );
    if (exp) {
      setSaved(exp);
      setParsed(null);
      setText('');
      refresh();
    }
  }

  function row(name: FieldName, label: string, input: JSX.Element) {
    const isFlagged = flagged.includes(name);
    const ok = !isFlagged || confirmed.has(name);
    return (
      <div className="parsed-row">
        <span className="lbl">{label}</span>
        {input}
        <div className="state">
          {isFlagged ? (
            ok ? (
              <span className="chip ok">✔ confirmed</span>
            ) : (
              <>
                <span className="chip warn">⚠ not sure — check it</span>
                <button className="btn btn-warn btn-small" onClick={() => setConfirmed(new Set(confirmed).add(name))} disabled={name !== 'reason' && !form[name]}>
                  Confirm
                </button>
              </>
            )
          ) : (
            <span className="chip ok">✔ understood</span>
          )}
        </div>
      </div>
    );
  }

  const flagClass = (name: FieldName) => `input ${flagged.includes(name) && !confirmed.has(name) ? 'flag' : ''}`;
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <Screen title="Voice entry" subtitle="FR-06 · small costs by voice">
      {c.speech.isAvailable() ? (
        <button className="btn btn-primary btn-huge" onClick={speak} disabled={listening}>
          {listening ? '🎙 Listening…' : '🎙 Tap and speak'}
        </button>
      ) : (
        <Notice kind="info">Speech input is not available in this browser — type the sentence instead.</Notice>
      )}

      <div className="field">
        <label htmlFor="utt">What was said (you can type it)</label>
        <textarea id="utt" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Kecha veterinarga 150 ming, dori uchun" />
        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => { setText(ex); read(ex); }}>
              {ex}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary" onClick={() => read(text)} disabled={!text.trim()}>
          Read it
        </button>
      </div>

      <ErrorNotice error={error} />
      {saved && (
        <Notice kind="ok" title="Expense saved">
          {saved.describe()}: {uzs(saved.getAmount())}, {dayMonth(saved.getDate())}, {c.farm.houseOfBatch(saved.getBatchId())?.getName()} batch.
        </Notice>
      )}

      {parsed && (
        <div className="card">
          <h2>{parsed.needsConfirmation() ? 'Please check the amber fields' : 'Understood'}</h2>
          {row('amount', 'Amount', <input className={flagClass('amount')} inputMode="numeric" value={form.amount} onChange={set('amount')} placeholder="UZS" />)}
          {row('date', 'Date', <input className={flagClass('date')} type="date" value={form.date} onChange={set('date')} />)}
          {row(
            'category',
            'Category',
            <select className={flagClass('category')} value={form.category} onChange={set('category')}>
              <option value="">— choose —</option>
              {Object.values(ExpenseCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {EXPENSE_CATEGORY_LABEL[cat]}
                </option>
              ))}
            </select>,
          )}
          {row('reason', 'Reason', <input className={flagClass('reason')} style={{ fontSize: 16 }} value={form.reason} onChange={set('reason')} placeholder="what for" />)}
          <div className="field" style={{ marginTop: 10 }}>
            <label>House (batch it belongs to)</label>
            <HousePicker value={houseId} onChange={setHouseId} />
          </div>
          <button className="btn btn-primary btn-huge" style={{ marginTop: 12 }} onClick={save} disabled={!allConfirmed}>
            Save expense
          </button>
          {!allConfirmed && <p className="tiny muted">Confirm every amber field first — the app never guesses (FR-06).</p>}
        </div>
      )}
    </Screen>
  );
}
