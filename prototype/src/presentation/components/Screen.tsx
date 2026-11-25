import type { ReactNode } from 'react';
import { useUser } from '../AppContext';

/** Frame for every screen after login: green top bar with Back, title and the user. */
export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { route, back, user, logout } = useUser();
  return (
    <>
      <header className="topbar">
        {route.name !== 'home' && (
          <button className="back" onClick={back} aria-label="Back">
            ‹ Back
          </button>
        )}
        <div className="grow">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {route.name === 'home' && (
          <div className="who">
            <strong>{user.getName()}</strong>
            <button className="linkbtn" onClick={logout}>
              Log out
            </button>
          </div>
        )}
      </header>
      <main className="content">{children}</main>
    </>
  );
}
