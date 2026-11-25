import type { ReactNode } from 'react';

export function Notice({ kind, title, children }: { kind: 'ok' | 'warn' | 'err' | 'info'; title?: string; children?: ReactNode }) {
  return (
    <div className={`notice ${kind}`} role={kind === 'err' ? 'alert' : 'status'}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  );
}

export function ErrorNotice({ error }: { error: string | null }) {
  return error ? <Notice kind="err" title="Not saved">{error}</Notice> : null;
}
