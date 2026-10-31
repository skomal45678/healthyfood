import { Link, useSearchParams } from 'react-router-dom';
import {
  Camera,
  Check,
  ChevronRight,
  Clock,
  Droplets,
  GlassWater,
  Minus,
  NotebookPen,
  Plus,
  Scale,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { useApp } from '../store/useApp';
import { useDayLogs, useTargets } from '../lib/hooks';
import { dayState } from '../lib/day';
import { sumItems } from '../lib/nutrition';
import { dateKey, fmt } from '../lib/utils';
import { EmptyState, Badge } from '../components/ui';
import { Ring, MacroTile, MacroLine } from '../components/Macros';
import { AdjustDayModal, AllergyAlert } from '../components/FoodDialogs';

const GLASS_ML = 250;

function greeting(name) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}` : part;
}

function QuickAction({ to, onClick, icon: Icon, label, disabled }) {
  const cls =
    'flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-white/15 px-2 py-3 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25 active:scale-[.97] disabled:pointer-events-none disabled:opacity-50';
  const body = (
    <>
      <Icon className="h-5 w-5" />
      {label}
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button className={cls} onClick={onClick} disabled={disabled}>
      {body}
    </button>
  );
}

export default function Dashboard() {
  const date = dateKey();
  const profile = useApp((s) => s.profile);
  const plan = useApp((s) => s.plans[date]);
  const logs = useDayLogs(date);
  const water = useApp((s) => s.water[date] || 0);
  const addWater = useApp((s) => s.addWater);
  const toggleEaten = useApp((s) => s.togglePlanMealEaten);
  const removeLog = useApp((s) => s.removeLog);
  const targets = useTargets();
  const [params, setParams] = useSearchParams();

  const adjustOpen = params.get('adjust') === '1';
  const setAdjustOpen = (open) => setParams(open ? { adjust: '1' } : {}, { replace: true });

  const { consumed, status, remainingMeals, extraLogs } = dayState(plan, logs);

  if (!targets) return null;

  const glasses = Math.ceil(targets.waterMl / GLASS_ML);
  const filled = Math.floor(water / GLASS_ML);
  const eatenCount = plan ? plan.meals.filter((m) => status[m.id]).length : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-brand-500 via-brand-600 to-accent-600 p-5 text-white shadow-glow sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-accent-400/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-5 md:max-w-md">
            <div>
              <p className="text-sm font-medium text-white/80">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{greeting(profile?.name)}</h1>
              <p className="mt-1 text-sm text-white/80">
                {plan
                  ? `${eatenCount} of ${plan.meals.length} planned meals done · ${fmt(consumed.protein)} g protein so far`
                  : 'Create a plan or log a meal to start tracking today.'}
              </p>
            </div>
            <div className="flex gap-2">
              <QuickAction to="/scan" icon={Camera} label="Scan meal" />
              <QuickAction to="/log" icon={NotebookPen} label="Log food" />
              <QuickAction onClick={() => setAdjustOpen(true)} icon={Wand2} label="Adjust day" disabled={!remainingMeals.length} />
            </div>
          </div>
          <div className="self-center rounded-full bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur">
            <Ring value={consumed.kcal} target={targets.kcal} onDark />
          </div>
        </div>
      </section>

      {/* Macros */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MacroTile name="protein" value={consumed.protein} target={targets.protein} />
        <MacroTile name="carbs" value={consumed.carbs} target={targets.carbs} />
        <MacroTile name="fat" value={consumed.fat} target={targets.fat} />
        <MacroTile name="fiber" value={consumed.fiber} target={targets.fiber} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Today&apos;s plan</h2>
            <Link to="/plan" className="link inline-flex items-center gap-0.5">
              {plan ? 'Edit plan' : 'Plans'} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {!plan ? (
            <EmptyState
              icon={Sparkles}
              title="No plan for today"
              text="Generate an AI meal plan tailored to your goal, then tick meals off as you eat them."
              action={
                <Link to="/plan" className="btn-primary">
                  <Sparkles className="h-4 w-4" /> Create today&apos;s plan
                </Link>
              }
            />
          ) : (
            <>
              <AllergyAlert items={plan.meals.flatMap((m) => m.items)} />
              <div className="space-y-2.5">
                {plan.meals.map((meal) => {
                  const st = status[meal.id];
                  return (
                    <div
                      key={meal.id}
                      className={`card flex items-start gap-3.5 !p-4 transition ${
                        st === 'eaten' ? '!border-brand-200 !bg-brand-50/80 dark:!border-brand-500/20 dark:!bg-brand-500/5' : ''
                      } ${st === 'replaced' ? 'opacity-70' : ''}`}
                    >
                      <button
                        onClick={() => toggleEaten(date, meal)}
                        disabled={st === 'replaced'}
                        aria-label={st === 'eaten' ? `Unmark ${meal.name}` : `Mark ${meal.name} as eaten`}
                        aria-pressed={st === 'eaten'}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 transition active:scale-90 disabled:opacity-50 ${
                          st === 'eaten'
                            ? 'border-transparent bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-glow'
                            : 'border-slate-200 text-transparent hover:border-brand-400 hover:text-brand-400 dark:border-slate-700'
                        }`}
                      >
                        <Check className="h-5 w-5" strokeWidth={3} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className={`font-semibold ${st ? 'text-slate-500 line-through decoration-slate-300 dark:text-slate-400' : ''}`}>
                            {meal.name}
                          </h3>
                          {meal.time && (
                            <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <Clock className="h-3 w-3" /> {meal.time}
                            </span>
                          )}
                          {st === 'replaced' && <Badge tone="blue">Replaced by your log</Badge>}
                        </div>
                        <p className="muted mt-1 line-clamp-2 text-sm">{meal.items.map((i) => i.name).join(', ')}</p>
                        {st !== 'replaced' && <MacroLine t={sumItems(meal.items)} className="mt-1.5 block text-xs sm:text-sm" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {extraLogs.length > 0 && (
            <>
              <h2 className="section-title pt-3">Logged food</h2>
              <div className="space-y-2.5">
                {extraLogs.map((log) => (
                  <div key={log.id} className="card flex items-center gap-3.5 !p-3.5">
                    {log.thumb ? (
                      <img src={log.thumb} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    ) : (
                      <div className="icon-tile h-14 w-14 !rounded-xl">
                        <NotebookPen className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{log.mealName}</p>
                      <p className="muted truncate text-sm">{log.dish || log.items.map((i) => i.name).join(', ')}</p>
                      <MacroLine t={sumItems(log.items)} className="text-xs sm:text-sm" />
                    </div>
                    <button className="icon-btn hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-500/10" onClick={() => removeLog(date, log.id)} aria-label="Delete log">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2.5 font-semibold">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                  <Droplets className="h-4.5 w-4.5" />
                </span>
                Water
              </h3>
              <span className="text-sm tabular-nums">
                <strong>{(water / 1000).toFixed(2)}</strong>
                <span className="muted"> / {targets.waterMl / 1000} L</span>
              </span>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5" aria-hidden>
              {Array.from({ length: glasses }, (_, i) => (
                <GlassWater
                  key={i}
                  className={`h-6 w-6 transition ${i < filled ? 'fill-sky-200 text-sky-500 dark:fill-sky-500/30 dark:text-sky-400' : 'text-slate-300 dark:text-slate-700'}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary w-12 !px-0" onClick={() => addWater(date, -GLASS_ML)} disabled={!water} aria-label="Remove a glass">
                <Minus className="h-4 w-4" />
              </button>
              <button
                className="btn flex-1 bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_8px_24px_-6px_rgb(14_165_233/0.5)] hover:brightness-105"
                onClick={() => addWater(date, GLASS_ML)}
              >
                <Plus className="h-4 w-4" /> Add glass · 250 ml
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-3 flex items-center gap-2.5 font-semibold">
              <span className="icon-tile h-9 w-9">
                <Scale className="h-4.5 w-4.5" />
              </span>
              Your targets
            </h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <dt className="muted text-xs">Daily calories</dt>
                <dd className="font-bold tabular-nums">{fmt(targets.kcal)} kcal</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <dt className="muted text-xs">Protein</dt>
                <dd className="font-bold tabular-nums">{targets.protein} g</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <dt className="muted text-xs">Goal</dt>
                <dd className="font-bold capitalize">{profile.goal}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <dt className="muted text-xs">TDEE</dt>
                <dd className="font-bold tabular-nums">{fmt(targets.tdee)} kcal</dd>
              </div>
            </dl>
            <Link to="/onboarding" className="link mt-3 inline-flex items-center gap-0.5">
              Edit profile <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>

      <AdjustDayModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  );
}
