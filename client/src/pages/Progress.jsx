import { useState } from 'react';
import toast from 'react-hot-toast';
import { Flame, Scale, Target, TrendingDown, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useApp } from '../store/useApp';
import { useTargets } from '../lib/hooks';
import { sumLogs, bmi, r1 } from '../lib/nutrition';
import { addDays, dateKey, fmt } from '../lib/utils';
import { PageHeader } from '../components/ui';

const tooltipStyle = { borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 12 };

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="card">
      <p className="muted flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
        <Icon className="h-4 w-4" /> {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="muted text-xs">{sub}</p>}
    </div>
  );
}

export default function Progress() {
  const today = dateKey();
  const weights = useApp((s) => s.weights);
  const logs = useApp((s) => s.logs);
  const profile = useApp((s) => s.profile);
  const logWeight = useApp((s) => s.logWeight);
  const targets = useTargets();
  const [kg, setKg] = useState('');

  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const daily = days.map((d) => {
    const t = sumLogs(logs[d]);
    return { date: d.slice(5), kcal: Math.round(t.kcal), protein: Math.round(t.protein) };
  });
  const loggedDays = daily.filter((d) => d.kcal > 0);
  const avgKcal = loggedDays.length ? loggedDays.reduce((s, d) => s + d.kcal, 0) / loggedDays.length : 0;
  const avgProtein = loggedDays.length ? loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length : 0;

  // Consecutive days with at least one log, counting back from today (or yesterday).
  let streak = 0;
  for (let d = logs[today]?.length ? today : addDays(today, -1); logs[d]?.length; d = addDays(d, -1)) streak++;

  const first = weights[0]?.kg;
  const latest = weights.at(-1)?.kg;
  const change = first != null && latest != null ? r1(latest - first) : 0;
  const bmiInfo = bmi({ weightKg: latest || profile?.weightKg, heightCm: profile?.heightCm });

  const save = (e) => {
    e.preventDefault();
    const n = parseFloat(kg);
    if (!(n >= 30 && n <= 300)) return toast.error('Enter a weight between 30 and 300 kg');
    logWeight(today, n);
    setKg('');
    toast.success('Weight logged');
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Progress" subtitle="Weight trend, calorie history and streaks." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Flame} label="Logging streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
        <Stat icon={Target} label="Avg kcal (14d)" value={fmt(avgKcal)} sub={targets && `target ${fmt(targets.kcal)}`} />
        <Stat icon={TrendingUp} label="Avg protein" value={`${fmt(avgProtein)} g`} sub={targets && `target ${targets.protein} g`} />
        <Stat
          icon={change <= 0 ? TrendingDown : TrendingUp}
          label="Weight change"
          value={`${change > 0 ? '+' : ''}${change} kg`}
          sub={bmiInfo && `BMI ${bmiInfo.value} · ${bmiInfo.label}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <Scale className="h-5 w-5 text-brand-600" /> Weight
            </h2>
            <form onSubmit={save} className="flex gap-2">
              <input
                className="input !w-28 !py-1.5"
                type="number"
                step="0.1"
                placeholder="kg today"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                aria-label="Today's weight in kg"
              />
              <button className="btn-primary !py-1.5">Log</button>
            </form>
          </div>
          {weights.length < 2 ? (
            <p className="muted py-10 text-center text-sm">Log your weight on a few different days to see a trend.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={weights.map((w) => ({ date: w.date.slice(5), kg: w.kg }))} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                {profile?.targetWeightKg && <ReferenceLine y={profile.targetWeightKg} stroke="#16a34a" strokeDasharray="4 4" />}
                <Line type="monotone" dataKey="kg" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Calories, last 14 days</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={daily} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={1} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(120,113,108,0.1)' }} />
              {targets && <ReferenceLine y={targets.kcal} stroke="#ef4444" strokeDasharray="4 4" />}
              <Bar dataKey="kcal" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="muted mt-1 text-xs">Dashed line = your daily target.</p>
        </div>
      </div>
    </div>
  );
}
