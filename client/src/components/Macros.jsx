import { useId } from 'react';
import { fmt } from '../lib/utils';

export function Ring({ value, target, size = 168, stroke = 14, label = 'kcal', onDark = false }) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target ? Math.min(1, value / target) : 0;
  const over = target && value > target * 1.05;
  const left = Math.round((target || 0) - value);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={over ? '#f87171' : onDark ? '#ffffff' : '#34d399'} />
            <stop offset="100%" stopColor={over ? '#dc2626' : onDark ? '#ccfbf1' : '#0d9488'} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className={`fill-none ${onDark ? 'stroke-white/20' : 'stroke-slate-100 dark:stroke-slate-800'}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          stroke={`url(#ring-${id})`}
          className="fill-none transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tracking-tight tabular-nums">{fmt(value)}</span>
        <span className={`text-xs ${onDark ? 'text-white/75' : 'muted'}`}>
          of {fmt(target)} {label}
        </span>
        <span
          className={`mt-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
            left < 0
              ? 'bg-red-500/15 text-red-600 dark:text-red-400'
              : onDark
                ? 'bg-white/20 text-white'
                : 'bg-brand-500/10 text-brand-700 dark:text-brand-400'
          }`}
        >
          {left < 0 ? `${fmt(-left)} over` : `${fmt(left)} left`}
        </span>
      </div>
    </div>
  );
}

const COLORS = { protein: 'bg-protein', carbs: 'bg-carbs', fat: 'bg-fat', fiber: 'bg-brand-500' };
const TRACKS = {
  protein: 'bg-protein/12',
  carbs: 'bg-carbs/12',
  fat: 'bg-fat/12',
  fiber: 'bg-brand-500/12',
};

export function MacroBar({ name, value, target, unit = 'g' }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="flex items-center gap-2 font-medium capitalize">
          <span className={`h-2 w-2 rounded-full ${COLORS[name] || 'bg-brand-500'}`} />
          {name}
        </span>
        <span className="muted tabular-nums">
          <span className="font-semibold text-slate-700 dark:text-slate-200">{fmt(value)}</span> / {fmt(target)} {unit}
        </span>
      </div>
      <div className={`h-2.5 overflow-hidden rounded-full ${TRACKS[name] || 'bg-slate-100 dark:bg-slate-800'}`}>
        <div className={`h-full rounded-full transition-all duration-700 ${COLORS[name] || 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Compact stat tile for the dashboard macro grid.
export function MacroTile({ name, value, target, unit = 'g' }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const left = Math.max(0, Math.round((target || 0) - value));
  return (
    <div className="card !p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium capitalize">
          <span className={`h-2.5 w-2.5 rounded-full ${COLORS[name] || 'bg-brand-500'}`} />
          {name}
        </span>
        <span className="muted text-xs tabular-nums">{Math.round(pct)}%</span>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight tabular-nums">
        {fmt(value)}
        <span className="muted text-sm font-medium">
          {' '}
          / {fmt(target)} {unit}
        </span>
      </p>
      <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${TRACKS[name] || 'bg-slate-100 dark:bg-slate-800'}`}>
        <div className={`h-full rounded-full transition-all duration-700 ${COLORS[name] || 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="muted mt-1.5 text-xs">{left ? `${fmt(left)} ${unit} to go` : 'Target reached'}</p>
    </div>
  );
}

// Compact "520 kcal · P 30 · C 60 · F 15" line.
export function MacroLine({ t, className = '' }) {
  return (
    <span className={`tabular-nums ${className}`}>
      <strong>{fmt(t.kcal)}</strong> kcal
      <span className="muted">
        {' '}· <span className="font-medium text-protein">P</span> {fmt(t.protein)} · <span className="font-medium text-carbs">C</span>{' '}
        {fmt(t.carbs)} · <span className="font-medium text-fat">F</span> {fmt(t.fat)}
      </span>
    </span>
  );
}
