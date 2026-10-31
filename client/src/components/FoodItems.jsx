import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { r1, scaleItem, sumItems } from '../lib/nutrition';
import { uid } from '../lib/utils';
import { Badge } from './ui';
import { MacroLine } from './Macros';

// Number input that only commits on blur/Enter so each keystroke doesn't
// create an undo step or rescale the item.
export function QtyInput({ value, onCommit, className = '' }) {
  const [draft, setDraft] = useState(null);
  const commit = () => {
    if (draft === null) return;
    const n = parseFloat(draft);
    if (!Number.isNaN(n) && n >= 0 && n !== value) onCommit(n);
    setDraft(null);
  };
  return (
    <input
      type="number"
      inputMode="decimal"
      min="0"
      step="any"
      className={`input !w-20 !px-2 !py-1 text-right ${className}`}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      aria-label="Quantity"
    />
  );
}

const NUM_FIELDS = [
  ['kcal', 'kcal'],
  ['protein', 'P g'],
  ['carbs', 'C g'],
  ['fat', 'F g'],
];

function confidenceTone(c) {
  if (c >= 0.75) return 'green';
  if (c >= 0.5) return 'amber';
  return 'red';
}

// Fully editable list used to review AI results before saving them.
export function FoodItemsEditor({ items, onChange }) {
  const update = (id, patch) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id) => onChange(items.filter((i) => i.id !== id));
  const add = () =>
    onChange([...items, { id: uid(), name: '', qty: 1, unit: 'serving', grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }]);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-stone-200 p-3 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <input
              className="input flex-1 !py-1.5 font-medium"
              value={item.name}
              placeholder="Food name"
              onChange={(e) => update(item.id, { name: e.target.value })}
              aria-label="Food name"
            />
            {item.confidence != null && (
              <Badge tone={confidenceTone(item.confidence)}>{Math.round(item.confidence * 100)}% sure</Badge>
            )}
            <button className="icon-btn" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <QtyInput value={item.qty} onCommit={(q) => onChange(items.map((i) => (i.id === item.id ? scaleItem(i, q) : i)))} />
            <input
              className="input !w-24 !px-2 !py-1"
              value={item.unit}
              onChange={(e) => update(item.id, { unit: e.target.value })}
              aria-label="Unit"
            />
            {item.grams > 0 && <span className="muted">≈ {Math.round(item.grams)} g</span>}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {NUM_FIELDS.map(([field, label]) => (
              <label key={field} className="text-xs">
                <span className="muted">{label}</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  className="input !px-2 !py-1"
                  value={item[field]}
                  onChange={(e) => update(item.id, { [field]: Math.max(0, parseFloat(e.target.value) || 0) })}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={add}>
          <Plus className="h-4 w-4" /> Add item
        </button>
        <MacroLine t={sumItems(items)} className="text-sm" />
      </div>
    </div>
  );
}

export function ItemSummary({ item }) {
  return (
    <span className="muted text-xs tabular-nums">
      {r1(item.qty)} {item.unit} · {Math.round(item.kcal)} kcal · P {r1(item.protein)} · C {r1(item.carbs)} · F {r1(item.fat)}
    </span>
  );
}
