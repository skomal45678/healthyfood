import { useEffect } from 'react';
import { Loader2, X } from 'lucide-react';

export function Spinner({ className = 'h-4 w-4' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />;
}

export function Button({ variant = 'primary', loading, disabled, children, className = '', ...props }) {
  return (
    <button className={`btn-${variant} ${className}`} disabled={loading || disabled} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="icon-tile h-11 w-11">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="muted mt-0.5 text-sm">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="muted mt-1 block text-xs">{hint}</span>}
    </label>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {Icon && (
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 opacity-30 blur-xl" />
          <div className="relative rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 p-3.5 text-white shadow-glow">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="muted mt-1 max-w-sm text-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-950/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92dvh] w-full animate-slide-up flex-col rounded-t-3xl bg-white shadow-lift sm:animate-scale-in sm:rounded-3xl dark:bg-slate-900 ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden dark:bg-slate-700" aria-hidden />
        <div className="flex items-center justify-between px-5 pb-2 pt-3 sm:pt-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button className="icon-btn -mr-2" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    blue: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  };
  return <span className={`chip ${tones[tone] || tones.slate}`}>{children}</span>;
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

// Pill toggle group. options: [{ value, label, icon? }]
export function Segmented({ value, onChange, options, className = '', size = 'md' }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';
  return (
    <div role="radiogroup" className={`segmented ${className}`}>
      {options.map(({ value: v, label, icon: Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition ${pad} ${
              active
                ? 'bg-white text-slate-900 shadow-soft dark:bg-slate-950 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Large selectable card used in place of short <select>s.
export function ChoiceCard({ active, onClick, title, text, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
        active
          ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-500/10 dark:border-brand-500 dark:bg-brand-500/10'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
      }`}
    >
      {Icon && (
        <span className={`icon-tile h-9 w-9 ${active ? '' : '!bg-slate-100 !text-slate-500 dark:!bg-slate-800 dark:!text-slate-400'}`}>
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        {text && <span className="muted block text-xs">{text}</span>}
      </span>
    </button>
  );
}
