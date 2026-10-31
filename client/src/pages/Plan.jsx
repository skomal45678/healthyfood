import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  Sparkles,
  RefreshCw,
  Trash2,
  Repeat,
  Ban,
  Plus,
  Undo2,
  ChefHat,
  CalendarRange,
  AlertTriangle,
  Clock,
  Lightbulb,
} from 'lucide-react';
import { useApp } from '../store/useApp';
import { api, profileForAI } from '../lib/api';
import { useTargets } from '../lib/hooks';
import { deviation, scaleItem, sumItems, sumMeals } from '../lib/nutrition';
import { addDays, dateKey, prettyDate, withIds } from '../lib/utils';
import { Button, EmptyState, PageHeader, Badge, Skeleton } from '../components/ui';
import { MacroLine, MacroBar } from '../components/Macros';
import { QtyInput } from '../components/FoodItems';
import { AddFoodModal, AllergyAlert, RecipeModal, SwapModal } from '../components/FoodDialogs';

const DAYS = 7;

function MealCard({ meal, onItemQty, onRemoveItem, onSwap, onBan, onAdd, onRegenerate, onRecipe, regenerating }) {
  const totals = sumItems(meal.items);
  return (
    <div className="card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight">{meal.name}</h3>
            {meal.time && (
              <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Clock className="h-3 w-3" /> {meal.time}
              </span>
            )}
          </div>
          <MacroLine t={totals} className="mt-0.5 block text-sm" />
        </div>
        <div className="flex shrink-0 gap-1">
          <button className="icon-btn" title="Recipe" onClick={onRecipe} aria-label="Show recipe">
            <ChefHat className="h-4 w-4" />
          </button>
          <button className="icon-btn" title="Regenerate this meal" onClick={onRegenerate} disabled={regenerating} aria-label="Regenerate meal">
            <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <ul className="divide-y divide-slate-100 rounded-2xl bg-slate-50/70 px-3 dark:divide-slate-800 dark:bg-slate-800/30">
        {meal.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2.5">
            <div className="min-w-[10rem] flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="muted text-xs tabular-nums">
                {Math.round(item.kcal)} kcal · P {Math.round(item.protein)} · C {Math.round(item.carbs)} · F {Math.round(item.fat)}
                {item.grams > 0 && ` · ${Math.round(item.grams)} g`}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-0.5">
              <QtyInput value={item.qty} onCommit={(q) => onItemQty(item, q)} />
              <span className="muted w-16 truncate text-xs" title={item.unit}>
                {item.unit}
              </span>
              <button className="icon-btn" title="Swap with AI" onClick={() => onSwap(item)} aria-label={`Swap ${item.name}`}>
                <Repeat className="h-4 w-4" />
              </button>
              <button className="icon-btn" title="Never suggest this again" onClick={() => onBan(item)} aria-label={`Never suggest ${item.name}`}>
                <Ban className="h-4 w-4" />
              </button>
              <button className="icon-btn hover:!text-red-600" title="Remove" onClick={() => onRemoveItem(item)} aria-label={`Remove ${item.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {!meal.items.length && <li className="muted py-2 text-sm">No items. Add something below.</li>}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button className="btn-ghost !px-2 !text-brand-600 dark:!text-brand-400" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add item
        </button>
        {meal.notes && <p className="muted max-w-[60%] text-right text-xs">{meal.notes}</p>}
      </div>
    </div>
  );
}

export default function Plan() {
  const today = dateKey();
  const [date, setDate] = useState(today);
  const plans = useApp((s) => s.plans);
  const profile = useApp((s) => s.profile);
  const setPlan = useApp((s) => s.setPlan);
  const updateMeals = useApp((s) => s.updateMeals);
  const addDislike = useApp((s) => s.addDislike);
  const undo = useApp((s) => s.undo);
  const canUndo = useApp((s) => s.undoStack.length > 0);
  const targets = useTargets();

  const [loading, setLoading] = useState(false);
  const [weekProgress, setWeekProgress] = useState(null);
  const [regenId, setRegenId] = useState(null);
  const [swap, setSwap] = useState(null); // { mealId, item, mealName }
  const [addTo, setAddTo] = useState(null); // mealId
  const [recipeMeal, setRecipeMeal] = useState(null);

  const plan = plans[date];
  const totals = sumMeals(plan?.meals);
  const off = targets ? deviation(totals.kcal, targets.kcal) : 0;

  const recentMealNames = (exclude) =>
    Object.entries(plans)
      .filter(([d, p]) => d !== exclude && p?.meals && d >= addDays(today, -3))
      .flatMap(([, p]) => p.meals.flatMap((m) => m.items.map((i) => i.name)))
      .slice(0, 40);

  const generate = async (forDate = date, avoid = recentMealNames(forDate)) => {
    const res = await api.generatePlan({ profile: profileForAI(profile), targets, avoidMeals: avoid });
    const newPlan = { meals: withIds(res.meals), tips: res.tips, model: res.model, generatedAt: Date.now() };
    setPlan(forDate, newPlan);
    return newPlan;
  };

  const generateDay = async () => {
    setLoading(true);
    try {
      await generate();
      toast.success(`Plan ready for ${prettyDate(date).toLowerCase()}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate one day at a time so each request stays small for free models.
  const generateWeek = async () => {
    const missing = Array.from({ length: DAYS }, (_, i) => addDays(today, i)).filter((d) => !plans[d]);
    if (!missing.length) return toast('All 7 days already have a plan. Regenerate a single day instead.');
    let avoid = recentMealNames(null);
    let done = 0;
    for (const d of missing) {
      setWeekProgress(`${done + 1}/${missing.length}`);
      try {
        const p = await generate(d, avoid);
        avoid = [...p.meals.flatMap((m) => m.items.map((x) => x.name)), ...avoid].slice(0, 40);
        done++;
      } catch (err) {
        toast.error(`Stopped at ${prettyDate(d)}: ${err.message}`);
        break;
      }
    }
    setWeekProgress(null);
    if (done) toast.success(`Generated ${done} day${done > 1 ? 's' : ''} of meals`);
  };

  const mapItems = (mealId, fn) =>
    updateMeals(date, (meals) => meals.map((m) => (m.id === mealId ? { ...m, items: fn(m.items) } : m)));

  const regenerate = async (meal) => {
    setRegenId(meal.id);
    try {
      const share = targets && totals.kcal ? sumItems(meal.items).kcal / totals.kcal : null;
      const mealTargets = share && targets ? { kcal: targets.kcal * share, protein: targets.protein * share } : undefined;
      const res = await api.regenerateMeal({ meal, profile: profileForAI(profile), targets: mealTargets });
      const [fresh] = withIds([res.meal]);
      updateMeals(date, (meals) => meals.map((m) => (m.id === meal.id ? { ...fresh, id: meal.id, name: meal.name } : m)));
      toast.success(`New ${meal.name.toLowerCase()} ready`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRegenId(null);
    }
  };

  const ban = (meal, item) => {
    addDislike(item.name);
    mapItems(meal.id, (items) => items.filter((i) => i.id !== item.id));
    toast.success(`${item.name} removed and won't be suggested again`);
  };

  const allItems = plan?.meals?.flatMap((m) => m.items) || [];

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        title="Diet plan"
        subtitle="Generated by AI, edited by you. Change quantities, remove or swap anything."
        actions={
          <>
            <Button variant="secondary" onClick={() => undo() || toast('Nothing to undo')} disabled={!canUndo}>
              <Undo2 className="h-4 w-4" /> Undo
            </Button>
            <Button variant="secondary" onClick={generateWeek} loading={Boolean(weekProgress)}>
              <CalendarRange className="h-4 w-4" /> {weekProgress ? `Generating ${weekProgress}` : 'Generate week'}
            </Button>
          </>
        }
      />

      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {Array.from({ length: DAYS }, (_, i) => addDays(today, i)).map((d) => {
          const day = new Date(`${d}T00:00:00`);
          const active = d === date;
          return (
            <button
              key={d}
              onClick={() => setDate(d)}
              aria-pressed={active}
              className={`flex min-w-16 shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition ${
                active
                  ? 'border-transparent bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-glow'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
              }`}
            >
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${active ? 'text-white/80' : 'muted'}`}>
                {d === today ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <span className="text-lg font-bold tabular-nums">{day.getDate()}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${plans[d] ? (active ? 'bg-white' : 'bg-brand-500') : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>

      {!plan && loading ? (
        <div className="space-y-4" aria-label="Generating plan">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
          <p className="muted text-center text-sm">Building your plan, this can take up to 30 seconds…</p>
        </div>
      ) : !plan ? (
        <EmptyState
          icon={CalendarDays}
          title={`No plan for ${prettyDate(date).toLowerCase()} yet`}
          text={
            targets
              ? `AI will build ${profile.mealsPerDay || 4} meals around ${targets.kcal} kcal and ${targets.protein} g protein for your ${profile.dietType?.replace('_', '-')} diet.`
              : 'Complete your profile first.'
          }
          action={
            <Button onClick={generateDay} loading={loading} disabled={!targets}>
              <Sparkles className="h-4 w-4" /> {loading ? 'Generating (may take ~30s)…' : 'Generate my plan'}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <AllergyAlert items={allItems} />
            {plan.meals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                regenerating={regenId === meal.id}
                onItemQty={(item, q) => mapItems(meal.id, (items) => items.map((i) => (i.id === item.id ? scaleItem(i, q) : i)))}
                onRemoveItem={(item) => {
                  mapItems(meal.id, (items) => items.filter((i) => i.id !== item.id));
                  toast(`Removed ${item.name}`, { icon: '🗑️' });
                }}
                onSwap={(item) => setSwap({ mealId: meal.id, mealName: meal.name, item })}
                onBan={(item) => ban(meal, item)}
                onAdd={() => setAddTo(meal.id)}
                onRegenerate={() => regenerate(meal)}
                onRecipe={() => setRecipeMeal(meal)}
              />
            ))}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <div className="card space-y-3">
              <h3 className="section-title">Day total</h3>
              {targets && (
                <>
                  <MacroBar name="calories" value={totals.kcal} target={targets.kcal} unit="kcal" />
                  <MacroBar name="protein" value={totals.protein} target={targets.protein} />
                  <MacroBar name="carbs" value={totals.carbs} target={targets.carbs} />
                  <MacroBar name="fat" value={totals.fat} target={targets.fat} />
                  <MacroBar name="fiber" value={totals.fiber} target={targets.fiber} />
                </>
              )}
              {Math.abs(off) > 0.1 && (
                <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  This plan is {Math.round(Math.abs(off) * 100)}% {off > 0 ? 'above' : 'below'} your calorie target. Adjust quantities or regenerate.
                </p>
              )}
            </div>
            {plan.tips?.length > 0 && (
              <div className="card">
                <h3 className="section-title mb-3">Tips</h3>
                <ul className="space-y-2.5 text-sm">
                  {plan.tips.map((t, i) => (
                    <li key={i} className="flex gap-2.5">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile?.dislikes?.length > 0 && (
              <div className="card">
                <h3 className="section-title mb-3">Excluded foods</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.dislikes.map((d) => (
                    <Badge key={d}>{d}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={generateDay} loading={loading}>
                <RefreshCw className="h-4 w-4" /> Regenerate whole day
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPlan(date, undefined);
                  toast('Plan deleted. Use Undo to restore it.');
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete this plan
              </Button>
              {plan.model && <p className="muted text-center text-xs">Generated with {plan.model}</p>}
            </div>
          </aside>
        </div>
      )}

      <SwapModal
        open={Boolean(swap)}
        onClose={() => setSwap(null)}
        item={swap?.item}
        mealName={swap?.mealName}
        onAccept={(newItem) => mapItems(swap.mealId, (items) => items.map((i) => (i.id === swap.item.id ? newItem : i)))}
      />
      <AddFoodModal
        open={Boolean(addTo)}
        onClose={() => setAddTo(null)}
        title="Add to meal"
        onAdd={(items) => mapItems(addTo, (existing) => [...existing, ...items])}
      />
      <RecipeModal open={Boolean(recipeMeal)} onClose={() => setRecipeMeal(null)} meal={recipeMeal} />
    </div>
  );
}
