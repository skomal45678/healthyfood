import { Link, useSearchParams } from 'react-router-dom';
import { Camera, CheckCircle2, Circle, Droplets, Minus, NotebookPen, Plus, Scale, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { useApp } from '../store/useApp';
import { useDayLogs, useTargets } from '../lib/hooks';
import { dayState } from '../lib/day';
import { sumItems } from '../lib/nutrition';
import { dateKey, fmt } from '../lib/utils';
import { EmptyState, Badge } from '../components/ui';
import { Ring, MacroBar, MacroLine } from '../components/Macros';
import { AdjustDayModal, AllergyAlert } from '../components/FoodDialogs';

function greeting(name) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}` : part;
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting(profile?.name)}</h1>
        <p className="muted text-sm">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[auto_1fr]">
        <div className="card flex flex-col items-center justify-center gap-3 sm:flex-row md:flex-col">
          <Ring value={consumed.kcal} target={targets.kcal} />
        </div>
        <div className="card space-y-3">
          <MacroBar name="protein" value={consumed.protein} target={targets.protein} />
          <MacroBar name="carbs" value={consumed.carbs} target={targets.carbs} />
          <MacroBar name="fat" value={consumed.fat} target={targets.fat} />
          <MacroBar name="fiber" value={consumed.fiber} target={targets.fiber} />
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Link to="/scan" className="btn-primary flex-col !gap-1 !py-3">
              <Camera className="h-5 w-5" /> Scan
            </Link>
            <Link to="/log" className="btn-secondary flex-col !gap-1 !py-3">
              <NotebookPen className="h-5 w-5" /> Log food
            </Link>
            <button className="btn-secondary flex-col !gap-1 !py-3" onClick={() => setAdjustOpen(true)} disabled={!remainingMeals.length}>
              <Wand2 className="h-5 w-5" /> Adjust day
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today&apos;s plan</h2>
            <Link to="/plan" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
              Edit plan
            </Link>
          </div>
          {!plan ? (
            <EmptyState
              icon={Sparkles}
              title="No plan for today"
              text="Generate an AI meal plan tailored to your goal, then tick meals off as you eat them."
              action={
                <Link to="/plan" className="btn-primary">
                  Create today&apos;s plan
                </Link>
              }
            />
          ) : (
            <>
              <AllergyAlert items={plan.meals.flatMap((m) => m.items)} />
              {plan.meals.map((meal) => {
                const st = status[meal.id];
                return (
                  <div key={meal.id} className={`card flex gap-3 ${st ? 'opacity-70' : ''}`}>
                    <button
                      onClick={() => toggleEaten(date, meal)}
                      disabled={st === 'replaced'}
                      aria-label={st === 'eaten' ? `Unmark ${meal.name}` : `Mark ${meal.name} as eaten`}
                      className="mt-0.5 text-brand-600 disabled:text-stone-400"
                    >
                      {st === 'eaten' ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className={`font-semibold ${st ? 'line-through decoration-stone-400' : ''}`}>
                          {meal.name} {meal.time && <span className="muted text-sm font-normal">· {meal.time}</span>}
                        </h3>
                        {st === 'replaced' ? <Badge tone="blue">Replaced by your log</Badge> : <MacroLine t={sumItems(meal.items)} className="text-sm" />}
                      </div>
                      <p className="muted mt-0.5 text-sm">{meal.items.map((i) => i.name).join(', ')}</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {extraLogs.length > 0 && (
            <>
              <h2 className="pt-2 text-lg font-semibold">Logged food</h2>
              {extraLogs.map((log) => (
                <div key={log.id} className="card flex items-center gap-3">
                  {log.thumb ? (
                    <img src={log.thumb} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800">
                      <NotebookPen className="h-5 w-5 text-stone-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {log.mealName} <span className="muted text-sm font-normal">· {log.dish || log.items.map((i) => i.name).join(', ')}</span>
                    </p>
                    <MacroLine t={sumItems(log.items)} className="text-sm" />
                  </div>
                  <button className="icon-btn" onClick={() => removeLog(date, log.id)} aria-label="Delete log">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <Droplets className="h-5 w-5 text-blue-500" /> Water
              </h3>
              <span className="muted text-sm tabular-nums">
                {(water / 1000).toFixed(2)} / {targets.waterMl / 1000} L
              </span>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, (water / targets.waterMl) * 100)}%` }} />
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => addWater(date, -250)} disabled={!water} aria-label="Remove a glass">
                <Minus className="h-4 w-4" />
              </button>
              <button className="btn-primary flex-[2] !bg-blue-600 hover:!bg-blue-700" onClick={() => addWater(date, 250)}>
                <Plus className="h-4 w-4" /> 250 ml
              </button>
            </div>
          </div>

          <div className="card text-sm">
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <Scale className="h-5 w-5 text-brand-600" /> Your targets
            </h3>
            <p>
              <strong>{fmt(targets.kcal)}</strong> kcal · {targets.protein} g protein
            </p>
            <p className="muted">
              Goal: {profile.goal} · TDEE {fmt(targets.tdee)} kcal
            </p>
            <Link to="/onboarding" className="mt-2 inline-block font-medium text-brand-600 hover:underline dark:text-brand-400">
              Edit profile
            </Link>
          </div>
        </aside>
      </div>

      <AdjustDayModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  );
}
