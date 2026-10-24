import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  copy,
  aside,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  aside?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <p className="kicker">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="page-head__copy">
        <p>{copy}</p>
        {aside}
      </div>
    </header>
  );
}
