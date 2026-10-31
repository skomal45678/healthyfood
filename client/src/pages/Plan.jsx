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
} from 'lucide-react';
import { useApp } from '../store/useApp';
import { api, profileForAI } from '../lib/api';
import { useTargets } from '../lib/hooks';
import { deviation, scaleItem, sumItems, sumMeals } from '../lib/nutrition';
import { addDays, dateKey, prettyDate, withIds } from '../lib/utils';
import { Button, EmptyState, PageHeader, Badge } from '../components/ui';
import { MacroLine, MacroBar } from '../components/Macros';
import { QtyInput } from '../components/FoodItems';
import { AddFoodModal, AllergyAlert, RecipeModal, SwapModal } from '../components/FoodDialogs';

const DAYS = 7;

function MealCard({ meal, onItemQty, onRemoveItem, onSwap, onBan, onAdd, onRegenerate, onRecipe, regenerating }) {
  const totals = sumItems(meal.items);
  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">
            {meal.name} {meal.time && <span className="muted text-sm font-normal">· {meal.time}</span>}
          </h3>
          <MacroLine t={totals} className="text-sm" />
        </div>
        <div className="flex gap-1">
          <button className="icon-btn" title="Recipe" onClick={onRecipe} aria-label="Show recipe">
            <ChefHat className="h-4 w-4" />
          </button>
          <button className="icon-btn" title="Regenerate this meal" onClick={onRegenerate} disabled={regenerating} aria-label="Regenerate meal">
            <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {meal.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 py-2">
            <div className="min-w-[12rem] flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="muted text-xs tabular-nums">
                {Math.round(item.kcal)} kcal · P {Math.round(item.protein)} · C {Math.round(item.carbs)} · F {Math.round(item.fat)}
                {item.grams > 0 && ` · ${Math.round(item.grams)} g`}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1">
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

      <div className="mt-2 flex items-center justify-between">
        <button className="btn-ghost !px-2" onClick={onAdd}>
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

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {Array.from({ length: DAYS }, (_, i) => addDays(today, i)).map((d) => (
          <button
            key={d}
            onClick={() => setDate(d)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              d === date
                ? 'border-brand-500 bg-brand-600 text-white'
                : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900'
            }`}
          >
            {prettyDate(d)}
            {plans[d] && <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${d === date ? 'bg-white' : 'bg-brand-500'}`} />}
          </button>
        ))}
      </div>

      {!plan ? (
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
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
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

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="card space-y-3">
              <h3 className="font-semibold">Day total</h3>
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
                <p className="flex gap-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  This plan is {Math.round(Math.abs(off) * 100)}% {off > 0 ? 'above' : 'below'} your calorie target. Adjust quantities or regenerate.
                </p>
              )}
            </div>
            {plan.tips?.length > 0 && (
              <div className="card">
                <h3 className="mb-2 font-semibold">Tips</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {plan.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {profile?.dislikes?.length > 0 && (
              <div className="card">
                <h3 className="mb-2 font-semibold">Excluded foods</h3>
                <div className="flex flex-wrap gap-1">
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
