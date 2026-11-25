import { useState } from 'react';

/** Runs a service call and turns a refused business rule into a message for the screen. */
export function useAction() {
  const [error, setError] = useState<string | null>(null);

  function run<T>(fn: () => T): T | undefined {
    try {
      setError(null);
      return fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    }
  }

  return { error, setError, run };
}
