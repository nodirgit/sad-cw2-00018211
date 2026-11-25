import { useApp } from '../AppContext';

/** Big segmented buttons, one per house (NFR-05: as many as are configured). */
export function HousePicker({ value, onChange, needsOpenBatch = true }: { value: string; onChange: (id: string) => void; needsOpenBatch?: boolean }) {
  const { c } = useApp();
  return (
    <div className="seg" role="radiogroup" aria-label="House">
      {c.farm.houses().map((h) => {
        const batch = h.currentBatch();
        return (
          <button
            key={h.getId()}
            className={value === h.getId() ? 'on' : ''}
            disabled={needsOpenBatch && !batch}
            onClick={() => onChange(h.getId())}
            role="radio"
            aria-checked={value === h.getId()}
          >
            {h.getName()}
            <small>{batch ? `day ${batch.ageInDays()}` : 'no batch'}</small>
          </button>
        );
      })}
    </div>
  );
}

/** First house that has an open batch — the sensible default. */
export function useDefaultHouse(preferred?: string): string {
  const { c } = useApp();
  if (preferred) return preferred;
  return c.farm.houses().find((h) => h.currentBatch())?.getId() ?? c.farm.houses()[0]?.getId() ?? '';
}
