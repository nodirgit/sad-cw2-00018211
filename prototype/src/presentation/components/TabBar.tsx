import type { ReactNode } from 'react';
import { TabId, useUser } from '../AppContext';

const ICON: Record<TabId, ReactNode> = {
  main: <path d="M3 10.5 12 3l9 7.5M5 9v12h5v-6h4v6h5V9" />,
  slaughter: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3h6v3H9zM8.5 11h7M8.5 15h7M8.5 19h4" />
    </>
  ),
  sales: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  expenses: <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21zM9 8h6M9 12h6M9 16h3" />,
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.2 3.6-6.5 8-6.5s8 2.3 8 6.5" />
    </>
  ),
};

const TABS: { id: TabId; label: string; directorOnly: boolean }[] = [
  { id: 'main', label: 'Main', directorOnly: false },
  { id: 'slaughter', label: 'Slaughter', directorOnly: true },
  { id: 'sales', label: 'Sales', directorOnly: true },
  { id: 'expenses', label: 'Expenses', directorOnly: true },
  { id: 'profile', label: 'Profile', directorOnly: false },
];

/** Bottom bar with the app's main sections. A Worker sees only Main and Profile (NFR-03: no money). */
export function TabBar() {
  const { c, user, tab, switchTab } = useUser();
  const director = c.policy.canSeeMoney(user);
  return (
    <nav className="tabbar" aria-label="Main sections">
      {TABS.filter((t) => director || !t.directorOnly).map((t) => (
        <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => switchTab(t.id)}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {ICON[t.id]}
          </svg>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
