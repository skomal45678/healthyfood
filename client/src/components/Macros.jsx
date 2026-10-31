import { fmt } from '../lib/utils';

export function Ring({ value, target, size = 150, stroke = 14, label = 'kcal' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target ? Math.min(1, value / target) : 0;
  const over = target && value > target * 1.05;
  const left = Math.round((target || 0) - value);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-stone-200 dark:stroke-stone-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={`fill-none transition-all duration-700 ${over ? 'stroke-red-500' : 'stroke-brand-500'}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold">{fmt(value)}</span>
        <span className="muted text-xs">of {fmt(target)} {label}</span>
        <span className={`mt-1 text-xs font-semibold ${left < 0 ? 'text-red-500' : 'text-brand-600 dark:text-brand-400'}`}>
          {left < 0 ? `${fmt(-left)} over` : `${fmt(left)} left`}
        </span>
      </div>
    </div>
  );
}

const COLORS = { protein: 'bg-protein', carbs: 'bg-carbs', fat: 'bg-fat', fiber: 'bg-brand-500' };

export function MacroBar({ name, value, target, unit = 'g' }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium capitalize">{name}</span>
        <span className="muted tabular-nums">
          {fmt(value)} / {fmt(target)} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div className={`h-full rounded-full transition-all duration-700 ${COLORS[name] || 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Compact "520 kcal · P 30 · C 60 · F 15" line.
export function MacroLine({ t, className = '' }) {
  return (
    <span className={`tabular-nums ${className}`}>
      <strong>{fmt(t.kcal)}</strong> kcal
      <span className="muted">
        {' '}· <span className="text-protein">P</span> {fmt(t.protein)} · <span className="text-carbs">C</span> {fmt(t.carbs)} ·{' '}
        <span className="text-fat">F</span> {fmt(t.fat)}
      </span>
    </span>
  );
}
