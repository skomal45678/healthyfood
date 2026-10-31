import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShoppingCart, Sparkles, Copy, Trash2, Check } from 'lucide-react';
import { useApp } from '../store/useApp';
import { api } from '../lib/api';
import { addDays, dateKey, prettyDate } from '../lib/utils';
import { Button, EmptyState, PageHeader, Segmented } from '../components/ui';

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
      <PageHeader icon={ShoppingCart} title="Grocery list" subtitle="Built by AI from your planned meals, merged into shop-friendly quantities." />

      <div className="card mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div>
          <span className="label">Plan days to include</span>
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: 1, label: 'Today' },
              { value: 3, label: '3 days' },
              { value: 7, label: '7 days' },
            ]}
          />
        </div>
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-48 flex-1">
              <p className="text-sm">
                <strong>
                  {done}/{total}
                </strong>{' '}
                <span className="muted">
                  items checked · for {grocery.days} day{grocery.days > 1 ? 's' : ''}
                </span>
              </p>
              <div className="mt-1.5 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
                  style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                />
              </div>
            </div>
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
                <h3 className="mb-3 flex items-center justify-between font-semibold">
                  {cat.name}
                  <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{cat.items.length}</span>
                </h3>
                <ul className="-mx-2 space-y-0.5">
                  {cat.items.map((item) => {
                    const key = `${cat.name}:${item.name}`;
                    const checked = Boolean(grocery.checked?.[key]);
                    return (
                      <li key={key}>
                        <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggle(key)} />
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 ${
                              checked ? 'border-transparent bg-gradient-to-br from-brand-500 to-accent-600 text-white' : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
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
