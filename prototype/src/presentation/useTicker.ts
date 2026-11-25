import { useEffect } from 'react';

/** Calls onTick every `ms` while the screen is open (live sensor readings, FR-07). */
export function useTicker(onTick: () => void, ms = 3000) {
  useEffect(() => {
    const id = window.setInterval(onTick, ms);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);
}
