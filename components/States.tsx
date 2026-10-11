import type { ReactNode } from 'react';
import { Music2 } from 'lucide-react';

export function CardSkeletons({ count = 7 }: { count?: number }) {
  return (
    <div className="shelf" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card" style={{ pointerEvents: 'none' }}>
          <div className="skeleton aspect-square w-full rounded-xl" />
          <div className="skeleton mt-3 h-3.5 w-4/5" />
          <div className="skeleton mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function RowSkeletons({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5">
          <div className="skeleton h-11 w-11 rounded-lg" />
          <div className="flex-1">
            <div className="skeleton h-3.5 w-2/5" />
            <div className="skeleton mt-2 h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass flex flex-col items-center rounded-2xl px-6 py-10 text-center" role="alert">
      <Music2 size={26} className="mb-3 text-cherry-400" />
      <p className="max-w-sm text-sm text-white/75">{message}</p>
      {onRetry && (
        <button className="btn mt-5" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyBox({ icon, title, hint, children }: { icon?: ReactNode; title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
      <div className="mb-3 text-cherry-400">{icon ?? <Music2 size={28} />}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {hint && <p className="mt-1 max-w-sm text-sm text-white/50">{hint}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
