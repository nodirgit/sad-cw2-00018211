import { useState } from 'react';
import { DatePeriod } from '../../domain/DatePeriod';
import { toInputDate } from '../format';

type Choice = '7' | '30' | 'all' | 'custom';

const CHOICES: { key: Choice; label: string }[] = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Dates' },
];

/** Which time period a list shows. Starts at the last 7 days, so long histories are not all loaded at once. */
export function usePeriod() {
  const [choice, setChoice] = useState<Choice>('7');
  const today = toInputDate(new Date());
  const [from, setFrom] = useState(toInputDate(new Date(Date.now() - 6 * 86_400_000)));
  const [to, setTo] = useState(today);

  let period: DatePeriod;
  let error: string | null = null;
  if (choice === 'all') period = DatePeriod.allTime();
  else if (choice === 'custom') {
    try {
      period = DatePeriod.between(new Date(`${from}T12:00:00`), new Date(`${to}T12:00:00`));
    } catch (e) {
      error = (e as Error).message;
      period = DatePeriod.lastDays(7);
    }
  } else period = DatePeriod.lastDays(Number(choice));

  const describe = choice === 'all' ? 'total' : choice === 'custom' ? 'these dates' : `the last ${choice} days`;
  return { period, describe, choice, setChoice, from, setFrom, to, setTo, today, error };
}

/** Segment buttons 7 days · 30 days · All · Dates, with two date fields for "Dates". */
export function PeriodFilter({ state }: { state: ReturnType<typeof usePeriod> }) {
  const { choice, setChoice, from, setFrom, to, setTo, today, error } = state;
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="seg seg-small" role="radiogroup" aria-label="Period">
        {CHOICES.map((c) => (
          <button key={c.key} className={choice === c.key ? 'on' : ''} onClick={() => setChoice(c.key)} role="radio" aria-checked={choice === c.key}>
            {c.label}
          </button>
        ))}
      </div>
      {choice === 'custom' && (
        <div className="fieldrow" style={{ marginTop: 8 }}>
          <div className="field">
            <label htmlFor="pfrom">From</label>
            <input id="pfrom" className="input" type="date" max={today} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pto">To</label>
            <input id="pto" className="input" type="date" max={today} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      )}
      {error && <p className="small" style={{ color: 'var(--red)', margin: '6px 0 0' }}>{error}</p>}
    </div>
  );
}
