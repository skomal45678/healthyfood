import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShoppingCart, Sparkles, Copy, Trash2 } from 'lucide-react';
import { useApp } from '../store/useApp';
import { api } from '../lib/api';
import { addDays, dateKey, prettyDate } from '../lib/utils';
import { Button, EmptyState, PageHeader } from '../components/ui';

export default function Grocery() {
  const today = dateKey();
  const plans = useApp((s) => s.plans);
  const grocery = useApp((s) => s.grocery);
  const setGrocery = useApp((s) => s.setGrocery);
  const toggle = useApp((s) => s.toggleGrocery);
  const [range, setRange] = useState(7);
  const [loading, setLoading] = useState(false);

  const dates = Array.from({ length: range }, (_, i) => addDays(today, i)).filter((d) => plans[d]?.meals?.length);
  const meals = dates.flatMap((d) => plans[d].meals);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.groceryList({ meals, days: dates.length });
      setGrocery({ categories: res.categories, checked: {}, createdAt: Date.now(), days: dates.length });
      toast.success('Grocery list ready');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    const text = grocery.categories
      .map((c) => `${c.name}\n${c.items.map((i) => `- ${i.name}${i.quantity ? ` (${i.quantity})` : ''}`).join('\n')}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy');
    }
  };

  const total = grocery?.categories.reduce((n, c) => n + c.items.length, 0) || 0;
  const done = grocery ? Object.values(grocery.checked || {}).filter(Boolean).length : 0;

  return (
    <div>
      <PageHeader title="Grocery list" subtitle="Built by AI from your planned meals, merged into shop-friendly quantities." />

      <div className="card mb-5 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Plan days to include</span>
          <select className="input" value={range} onChange={(e) => setRange(Number(e.target.value))}>
            <option value={1}>Today only</option>
            <option value={3}>Next 3 days</option>
            <option value={7}>Next 7 days</option>
          </select>
        </label>
        <p className="muted flex-1 text-sm">
          {dates.length
            ? `${dates.length} planned day${dates.length > 1 ? 's' : ''}: ${dates.map(prettyDate).join(', ')}`
            : 'No plans in this range yet.'}
        </p>
        <Button onClick={generate} loading={loading} disabled={!meals.length}>
          <Sparkles className="h-4 w-4" /> {grocery ? 'Rebuild list' : 'Build list'}
        </Button>
      </div>

      {!grocery ? (
        <EmptyState
          icon={ShoppingCart}
          title="No grocery list yet"
          text="Generate a meal plan first, then build a consolidated shopping list from it."
          action={
            !meals.length && (
              <Link to="/plan" className="btn-primary">
                Go to diet plan
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="muted text-sm">
              {done}/{total} items checked · for {grocery.days} day{grocery.days > 1 ? 's' : ''}
            </p>
            <div className="flex gap-1">
              <button className="btn-ghost" onClick={copy}>
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button className="btn-ghost" onClick={() => setGrocery(null)}>
                <Trash2 className="h-4 w-4" /> Clear
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grocery.categories.map((cat) => (
              <div key={cat.name} className="card">
                <h3 className="mb-2 font-semibold">{cat.name}</h3>
                <ul className="space-y-1.5">
                  {cat.items.map((item) => {
                    const key = `${cat.name}:${item.name}`;
                    const checked = Boolean(grocery.checked?.[key]);
                    return (
                      <li key={key}>
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                          <input type="checkbox" className="mt-0.5 accent-brand-600" checked={checked} onChange={() => toggle(key)} />
                          <span className={checked ? 'muted line-through' : ''}>
                            {item.name} {item.quantity && <span className="muted">· {item.quantity}</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
