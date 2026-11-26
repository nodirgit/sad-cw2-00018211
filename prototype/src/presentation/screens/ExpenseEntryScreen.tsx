import { useState } from 'react';
import type { Expense } from '../../domain/finance/Expense';
import { EXPENSE_CATEGORY_LABEL, ExpenseCategory } from '../../domain/finance/Expense';
import { useUser } from '../AppContext';
import { HousePicker, useDefaultHouse } from '../components/HousePicker';
import { ErrorNotice, Notice } from '../components/Notice';
import { RowActions } from '../components/RowActions';
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

const emptyForm = (): Form => ({ amount: '', date: toInputDate(new Date()), category: '', reason: '' });

const formOf = (e: Expense): Form => ({ amount: String(e.getAmount()), date: toInputDate(e.getDate()), category: e.getCategory(), reason: e.getNote() });

/**
 * FR-03 + FR-06: small costs are typed into the form, or said aloud and the voice helper
 * fills the same form. Anything the parser is unsure of is amber until the Director checks it.
 */
export function ExpenseEntryScreen({ editId }: { editId?: string }) {
  const { c, user, refresh } = useUser();
  const defaultHouse = useDefaultHouse();
  const startEdit = editId ? c.profit.manualExpenses(user).find((e) => e.getId() === editId) : undefined;

  const [form, setForm] = useState<Form>(startEdit ? formOf(startEdit) : emptyForm());
  const [houseId, setHouseId] = useState(defaultHouse);
  const [editing, setEditing] = useState<Expense | null>(startEdit ?? null);
  const [unsure, setUnsure] = useState<Set<FieldName>>(new Set());
  const [saved, setSaved] = useState<string | null>(null);

  const [voiceOpen, setVoiceOpen] = useState(false);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const { error, setError, run } = useAction();

  const set = (k: FieldName) => (e: { target: { value: string } }) => {
    setForm({ ...form, [k]: e.target.value });
    // Changing a field by hand counts as checking it.
    if (unsure.has(k)) setUnsure(new Set([...unsure].filter((f) => f !== k)));
  };
  const confirmField = (k: FieldName) => setUnsure(new Set([...unsure].filter((f) => f !== k)));

  /** FR-06: the parser fills the form; unsure fields are marked, never guessed silently. */
  function fillFromVoice(utterance: string) {
    setSaved(null);
    const entry = run(() => c.voice.parse(utterance));
    if (!entry) return;
    const d = entry.getDate().getValue();
    setForm({
      amount: entry.getAmount().getValue() !== null ? String(entry.getAmount().getValue()) : form.amount,
      date: d ? toInputDate(d) : form.date,
      category: entry.getCategory().getValue() ?? form.category,
      reason: entry.getReason().getValue() ?? form.reason,
    });
    setUnsure(new Set(entry.flaggedFields() as FieldName[]));
    const n = entry.getHouseNumber().getValue();
    const spokenHouse = n !== null ? c.farm.houses()[n - 1] : undefined;
    if (!editing && spokenHouse?.currentBatch()) setHouseId(spokenHouse.getId());
    setVoiceNote(entry.needsConfirmation() ? 'Filled in. Check the amber fields below.' : 'Filled in. Check and save.');
  }

  function speak() {
    setListening(true);
    setError(null);
    c.speech
      .listen()
      .then((t) => {
        setText(t);
        fillFromVoice(t);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setListening(false));
  }

  function reset() {
    setForm(emptyForm());
    setUnsure(new Set());
    setEditing(null);
    setText('');
    setVoiceNote(null);
  }

  function save() {
    if (unsure.size > 0) return setError('Check the amber fields first: the app never guesses (FR-06).');
    const amount = form.amount ? parseNumber(form.amount) : null;
    const date = form.date ? new Date(`${form.date}T12:00:00`) : null;
    const category = (form.category as ExpenseCategory) || null;
    const exp = run(() => {
      if (editing) {
        if (amount === null || date === null || category === null) throw new Error('Fill in amount, date and category.');
        return c.profit.editExpense(editing.getId(), category, amount, form.reason, date, user);
      }
      return c.voice.confirm({ houseId, amount, date, category, reason: form.reason }, user);
    });
    if (exp) {
      setSaved(`${editing ? 'Changes saved' : 'Expense saved'}: ${exp.describe()}, ${uzs(exp.getAmount())}, ${dayMonth(exp.getDate())}, ${c.farm.houseOfBatch(exp.getBatchId())?.getName()} batch.`);
      reset();
      refresh();
    }
  }

  function startEditing(e: Expense) {
    setEditing(e);
    setForm(formOf(e));
    setUnsure(new Set());
    setSaved(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function remove(e: Expense) {
    if (run(() => (c.profit.deleteExpense(e.getId(), user), true))) {
      if (editing?.getId() === e.getId()) reset();
      setSaved(null);
      refresh();
    }
  }

  const cls = (k: FieldName) => `input ${unsure.has(k) ? 'flag' : ''}`;
  const unsureChip = (k: FieldName) =>
    unsure.has(k) && (
      <div className="row" style={{ marginTop: 4 }}>
        <span className="chip warn">⚠ not sure — check it</span>
        <button className="btn btn-warn btn-mini" onClick={() => confirmField(k)} disabled={k !== 'reason' && !form[k]}>
          It's right
        </button>
      </div>
    );

  const recent = c.profit.manualExpenses(user).slice(0, 8);

  return (
    <Screen title={editing ? "Edit expense" : "Expenses"} subtitle="FR-03 · FR-06 · type it, or say it">
      {!editing && (
        <div className="card">
          {!voiceOpen ? (
            <button className="btn btn-secondary" onClick={() => setVoiceOpen(true)}>
              🎙 Fill the form by voice (optional)
            </button>
          ) : (
            <>
              <div className="row">
                <h2 style={{ margin: 0 }}>🎙 Voice helper</h2>
                <button className="linkbtn" style={{ color: 'var(--muted)' }} onClick={() => setVoiceOpen(false)}>
                  Hide
                </button>
              </div>
              <p className="small muted" style={{ margin: '4px 0 8px' }}>
                Say the cost in Uzbek or English. The form below is filled for you to check.
              </p>
              {c.speech.isAvailable() ? (
                <button className="btn btn-primary" onClick={speak} disabled={listening}>
                  {listening ? '🎙 Listening…' : '🎙 Tap and speak'}
                </button>
              ) : (
                <Notice kind="info">Speech input is not available in this browser. Type the sentence instead.</Notice>
              )}
              <textarea className="input" style={{ marginTop: 8 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="or type it: Kecha veterinarga 150 ming, dori uchun" aria-label="Spoken sentence" />
              <div className="examples" style={{ marginTop: 8 }}>
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => { setText(ex); fillFromVoice(ex); }}>
                    {ex}
                  </button>
                ))}
              </div>
              <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => fillFromVoice(text)} disabled={!text.trim()}>
                Fill the form
              </button>
              {voiceNote && <div style={{ marginTop: 8 }}><Notice kind={unsure.size ? 'warn' : 'ok'}>{voiceNote}</Notice></div>}
            </>
          )}
        </div>
      )}

      <div className="card">
        <h2>{editing ? 'Edit expense' : 'New expense'}</h2>
        <div className="field">
          <label htmlFor="amount">Amount (UZS)</label>
          <input id="amount" className={cls('amount')} inputMode="numeric" value={form.amount} onChange={set('amount')} placeholder="e.g. 150000" />
          {unsureChip('amount')}
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="date">Date</label>
          <input id="date" className={cls('date')} type="date" value={form.date} onChange={set('date')} />
          {unsureChip('date')}
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label>Category</label>
          <div className="seg" style={{ gridAutoFlow: 'row', gridTemplateColumns: 'repeat(3, 1fr)' }} role="radiogroup" aria-label="Category">
            {Object.values(ExpenseCategory).map((cat) => (
              <button
                key={cat}
                className={form.category === cat ? 'on' : ''}
                style={unsure.has('category') ? { borderColor: 'var(--amber-line)' } : undefined}
                onClick={() => set('category')({ target: { value: cat } })}
                role="radio"
                aria-checked={form.category === cat}
              >
                {EXPENSE_CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>
          {unsureChip('category')}
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="reason">What for</label>
          <input id="reason" className={cls('reason')} style={{ fontSize: 17 }} value={form.reason} onChange={set('reason')} placeholder="e.g. vitamins" />
          {unsureChip('reason')}
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label>House (batch it belongs to)</label>
          {editing ? (
            <p className="small" style={{ margin: 0 }}>{c.farm.houseOfBatch(editing.getBatchId())?.getName()} batch (an expense stays on its batch)</p>
          ) : (
            <HousePicker value={houseId} onChange={setHouseId} />
          )}
        </div>
        <div className={editing ? 'fieldrow' : ''} style={{ marginTop: 12 }}>
          {editing && (
            <button className="btn btn-secondary" onClick={() => { reset(); setError(null); }}>
              Cancel
            </button>
          )}
          <button className="btn btn-primary btn-huge" onClick={save}>
            {editing ? 'Save changes' : 'Save expense'}
          </button>
        </div>
      </div>

      <ErrorNotice error={error} />
      {saved && <Notice kind="ok">{saved}</Notice>}

      <div className="card">
        <h2>Recent expenses</h2>
        <p className="tiny muted" style={{ marginTop: -4 }}>Feed costs and crew pay are not listed here: they change with their feed delivery or slaughter session.</p>
        {recent.length === 0 && <p className="small muted">None yet.</p>}
        {recent.map((e) => (
          <div key={e.getId()} className="rec">
            <div className="top">
              <div className="main">
                {e.describe()}
                <div className="tiny muted">
                  {dayMonth(e.getDate())} · {c.farm.houseOfBatch(e.getBatchId())?.getName() ?? 'removed house'}
                </div>
              </div>
              <span className="val neg">{uzs(e.getAmount())}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <RowActions onEdit={() => startEditing(e)} onDelete={() => remove(e)} confirmText={`Delete "${e.describe()}", ${uzs(e.getAmount())}?`} />
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}
