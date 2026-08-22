import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  leading,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {leading}
        <div>
          <h1 className="font-display text-xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-mist-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
