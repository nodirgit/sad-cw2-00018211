import type { ReactNode } from 'react';
import { useUser } from '../AppContext';

/** Frame for every screen after login: green top bar with Back (inside a section) and the title. */
export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { canGoBack, back, user } = useUser();
  return (
    <>
      <header className="topbar">
        {canGoBack && (
          <button className="back" onClick={back} aria-label="Back">
            ‹ Back
          </button>
        )}
        <div className="grow">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {!canGoBack && (
          <div className="who">
            <strong>{user.getName()}</strong>
          </div>
        )}
      </header>
      <main className="content">{children}</main>
    </>
  );
}
