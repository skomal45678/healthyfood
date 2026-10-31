import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, Sparkles, Clock, ChefHat } from 'lucide-react';
import { api, profileForAI } from '../lib/api';
import { fallbackAdjust, findAllergens, sumItems } from '../lib/nutrition';
import { useAllergies, useDayLogs, useTargets } from '../lib/hooks';
import { uid, withIds, dateKey } from '../lib/utils';
import { dayState, mealSlots, slotForNow } from '../lib/day';
import { useApp } from '../store/useApp';
import { Button, Modal, Field, Spinner } from './ui';
import { FoodItemsEditor, ItemSummary } from './FoodItems';
import { MacroLine } from './Macros';

export function AllergyAlert({ items }) {
  const allergies = useAllergies();
  const hits = findAllergens(items, allergies);
  if (!hits.length) return null;
  return (
    <div className="flex gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <span>
        <strong>Allergy warning:</strong> {hits.join(', ')}
      </span>
    </div>
  );
}

const withItemIds = (items) => items.map((i) => ({ ...i, id: i.id || uid() }));

// "Describe what you ate" (AI) or manual entry. Calls onAdd(items).
export function AddFoodModal({ open, onClose, onAdd, title = 'Add food' }) {
  const [tab, setTab] = useState('ai');
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setText('');
      setItems([]);
      setTab('ai');
    }
  }, [open]);

  const parse = async () => {
    setLoading(true);
    try {
      const res = await api.parseFood(text);
      setItems(withItemIds(res.items));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startManual = () => {
    setTab('manual');
    if (!items.length) setItems([{ id: uid(), name: '', qty: 1, unit: 'serving', grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }]);
  };

  const valid = items.filter((i) => i.name.trim());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <Button
            disabled={!valid.length}
            onClick={() => {
              onAdd(valid);
              onClose();
            }}
          >
            Add {valid.length || ''} item{valid.length === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <div className="mb-4 flex gap-1 rounded-xl bg-stone-100 p-1 text-sm dark:bg-stone-800">
        {[
          ['ai', 'Describe with AI'],
          ['manual', 'Enter manually'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => (k === 'manual' ? startManual() : setTab('ai'))}
            className={`flex-1 rounded-lg px-3 py-1.5 font-medium ${tab === k ? 'bg-white shadow-sm dark:bg-stone-900' : 'muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'ai' && (
        <div className="mb-4 space-y-2">
          <textarea
            className="input min-h-20"
            placeholder="e.g. 2 rotis, a bowl of dal, 1 glass of buttermilk"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button onClick={parse} loading={loading} disabled={!text.trim()}>
            <Sparkles className="h-4 w-4" /> Calculate nutrition
          </Button>
        </div>
      )}
      {items.length > 0 && <FoodItemsEditor items={items} onChange={setItems} />}
      {items.length > 0 && (
        <div className="mt-3">
          <AllergyAlert items={items} />
        </div>
      )}
    </Modal>
  );
}

// Pick a meal slot and save reviewed items to today's log.
export function SaveToLog({ items, source, thumb, dish, onSaved }) {
  const date = dateKey();
  const plan = useApp((s) => s.plans[date]);
  const logs = useDayLogs(date);
  const addLog = useApp((s) => s.addLog);
  const autoAdjust = useApp((s) => s.settings.autoAdjust);
  const navigate = useNavigate();
  const [slot, setSlot] = useState(() => slotForNow(plan));
  const { status } = dayState(plan, logs);
  const plannedMeal = plan?.meals?.find((m) => m.name === slot && !status[m.id]);
  const [replaces, setReplaces] = useState(true);

  const save = () => {
    addLog(date, {
      mealName: slot,
      source,
      items,
      thumb,
      dish,
      replacesMealId: plannedMeal && replaces ? plannedMeal.id : undefined,
    });
    onSaved?.();
    if (plan) {
      if (autoAdjust) navigate('/?adjust=1');
      else
        toast.success(
          (t) => (
            <span className="flex items-center gap-3">
              Logged to {slot}.
              <button
                className="btn-primary !px-2 !py-1"
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate('/?adjust=1');
                }}
              >
                Adjust my day
              </button>
            </span>
          ),
          { duration: 6000 }
        );
    } else toast.success(`Logged to ${slot}`);
  };

  return (
    <div className="space-y-3">
      <Field label="Meal">
        <select className="input" value={slot} onChange={(e) => setSlot(e.target.value)}>
          {mealSlots(plan).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      {plannedMeal && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 accent-brand-600" checked={replaces} onChange={(e) => setReplaces(e.target.checked)} />
          <span>
            I ate this <strong>instead of</strong> my planned {slot} ({Math.round(sumItems(plannedMeal.items).kcal)} kcal)
          </span>
        </label>
      )}
      <Button className="w-full" onClick={save} disabled={!items.length}>
        Save to today&apos;s log
      </Button>
    </div>
  );
}

export function SwapModal({ open, onClose, item, mealName, onAccept }) {
  const profile = useApp((s) => s.profile);
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setInstruction('');
      setResult(null);
    }
  }, [open]);

  const ask = async (text = instruction) => {
    setLoading(true);
    setResult(null);
    try {
      setResult(await api.swapItem({ item, mealName, instruction: text || undefined, profile: profileForAI(profile) }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Swap ${item.name}`}
      footer={
        result && (
          <>
            <button className="btn-secondary" onClick={() => ask()}>
              Try another
            </button>
            <Button
              onClick={() => {
                onAccept({ ...result.item, id: uid() });
                onClose();
              }}
            >
              Use {result.item.name}
            </Button>
          </>
        )
      }
    >
      <p className="muted mb-3 text-sm">
        Current: <ItemSummary item={item} />
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {['Dairy-free', 'Vegan', 'Higher protein', 'Cheaper', 'No cooking'].map((chip) => (
          <button key={chip} className="chip bg-stone-100 hover:bg-stone-200 dark:bg-stone-800" onClick={() => { setInstruction(chip); ask(chip); }}>
            {chip}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Any preference? (optional)"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
        />
        <Button onClick={() => ask()} loading={loading}>
          <Sparkles className="h-4 w-4" /> Suggest
        </Button>
      </div>
      {result && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-700/40 dark:bg-brand-700/10">
          <p className="font-semibold">{result.item.name}</p>
          <ItemSummary item={result.item} />
          {result.reason && <p className="mt-2 text-sm">{result.reason}</p>}
          <div className="mt-2">
            <AllergyAlert items={[result.item]} />
          </div>
        </div>
      )}
    </Modal>
  );
}

export function RecipeModal({ open, onClose, meal }) {
  const profile = useApp((s) => s.profile);
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !meal) return;
    let cancelled = false;
    setRecipe(null);
    setError('');
    api
      .recipe({ meal, profile: profileForAI(profile) })
      .then((r) => !cancelled && setRecipe(r))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [open, meal, profile]);

  return (
    <Modal open={open} onClose={onClose} title={recipe?.title || `${meal?.name || ''} recipe`} wide>
      {!recipe && !error && (
        <div className="muted flex items-center gap-2 py-8">
          <Spinner /> Writing your recipe…
        </div>
      )}
      {error && <p className="text-red-600">{error}</p>}
      {recipe && (
        <div className="space-y-4 text-sm">
          <p className="muted flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {Math.round(recipe.prepMinutes)} min
            </span>
            <span className="flex items-center gap-1">
              <ChefHat className="h-4 w-4" /> {Math.round(recipe.servings) || 1} serving
            </span>
          </p>
          <div>
            <h3 className="mb-1 font-semibold">Ingredients</h3>
            <ul className="list-disc space-y-0.5 pl-5">
              {recipe.ingredients.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 font-semibold">Steps</h3>
            <ol className="list-decimal space-y-1 pl-5">
              {recipe.steps.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ol>
          </div>
          {recipe.tips?.length > 0 && (
            <div>
              <h3 className="mb-1 font-semibold">Tips</h3>
              <ul className="list-disc space-y-0.5 pl-5">
                {recipe.tips.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// Re-balance the remaining meals of today's plan after logging food.
export function AdjustDayModal({ open, onClose }) {
  const date = dateKey();
  const plan = useApp((s) => s.plans[date]);
  const logs = useDayLogs(date);
  const profile = useApp((s) => s.profile);
  const targets = useTargets();
  const updateMeals = useApp((s) => s.updateMeals);
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');

  const { consumed, remainingMeals } = dayState(plan, logs);

  useEffect(() => {
    if (!open) return;
    setProposal(null);
    setError('');
    if (!remainingMeals.length) {
      setError('No remaining planned meals to adjust today.');
      return;
    }
    let cancelled = false;
    api
      .adjustDay({ profile: profileForAI(profile), targets, consumed, remainingMeals })
      .then((r) => {
        if (cancelled) return;
        // Map AI meals back onto the existing meal ids by name, then by position.
        const meals = remainingMeals.map((orig, idx) => {
          const m = r.meals.find((x) => x.name.toLowerCase() === orig.name.toLowerCase()) || r.meals[idx];
          return m ? { ...orig, items: withIds([m])[0].items, notes: m.notes || orig.notes } : orig;
        });
        setProposal({ meals, explanation: r.explanation, model: r.model });
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
    // Only re-run when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyFallback = () => {
    setError('');
    setProposal({
      meals: fallbackAdjust(remainingMeals, targets, consumed),
      explanation: 'Portions of your remaining meals were scaled to fit your remaining calories (offline calculation).',
    });
  };

  const accept = () => {
    const byId = Object.fromEntries(proposal.meals.map((m) => [m.id, m]));
    updateMeals(date, (meals) => meals.map((m) => byId[m.id] || m));
    toast.success('Plan updated for the rest of today');
    onClose();
  };

  const leftKcal = Math.max(0, (targets?.kcal || 0) - consumed.kcal);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust the rest of my day"
      wide
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Keep current plan
          </button>
          <Button onClick={accept} disabled={!proposal}>
            Apply changes
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm">
        Eaten so far: <MacroLine t={consumed} /> · <strong>{Math.round(leftKcal)}</strong> kcal left for the day
      </p>
      {!proposal && !error && (
        <div className="muted flex items-center gap-2 py-6">
          <Spinner /> AI is rebalancing your remaining meals…
        </div>
      )}
      {error && (
        <div className="space-y-3">
          <p className="text-red-600">{error}</p>
          {remainingMeals.length > 0 && (
            <button className="btn-secondary" onClick={applyFallback}>
              Use quick portion scaling instead
            </button>
          )}
        </div>
      )}
      {proposal && (
        <div className="space-y-3">
          {proposal.explanation && (
            <p className="rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-700/10">
              <Sparkles className="mr-1 inline h-4 w-4 text-brand-600" />
              {proposal.explanation}
            </p>
          )}
          {proposal.meals.map((m) => {
            const before = remainingMeals.find((o) => o.id === m.id);
            return (
              <div key={m.id} className="rounded-xl border border-stone-200 p-3 dark:border-stone-800">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{m.name}</h3>
                  <span className="text-sm tabular-nums">
                    <span className="muted line-through">{Math.round(sumItems(before?.items).kcal)}</span> →{' '}
                    <strong>{Math.round(sumItems(m.items).kcal)} kcal</strong>
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {m.items.map((i) => (
                    <li key={i.id} className="flex flex-wrap justify-between gap-2">
                      <span>{i.name}</span>
                      <ItemSummary item={i} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <AllergyAlert items={proposal.meals.flatMap((m) => m.items)} />
        </div>
      )}
    </Modal>
  );
}
