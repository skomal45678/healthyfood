import { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Trash2, Camera, NotebookPen, CalendarCheck, PencilLine } from 'lucide-react';
import { useApp } from '../store/useApp';
import { api } from '../lib/api';
import { useDayLogs, useTargets } from '../lib/hooks';
import { sumItems, sumLogs } from '../lib/nutrition';
import { addDays, dateKey, prettyDate, uid, fmt } from '../lib/utils';
import { Button, PageHeader, EmptyState } from '../components/ui';
import { FoodItemsEditor } from '../components/FoodItems';
import { AllergyAlert, SaveToLog } from '../components/FoodDialogs';
import { MacroLine } from '../components/Macros';

const SOURCE_ICON = { photo: Camera, text: NotebookPen, plan: CalendarCheck, manual: PencilLine };

const blankItem = () => ({ id: uid(), name: '', qty: 1, unit: 'serving', grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

export default function Log() {
  const today = dateKey();
  const [date, setDate] = useState(today);
  const logs = useDayLogs(date);
  const allLogs = useApp((s) => s.logs);
  const removeLog = useApp((s) => s.removeLog);
  const targets = useTargets();

  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [source, setSource] = useState('text');
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const parse = async () => {
    setLoading(true);
    try {
      const res = await api.parseFood(text);
      setItems(res.items.map((i) => ({ ...i, id: uid() })));
      setSource('text');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setText('');
    setItems([]);
    setFormKey((k) => k + 1);
  };

  const history = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).map((d) => ({ date: d, totals: sumLogs(allLogs[d]) }));

  return (
    <div>
      <PageHeader icon={NotebookPen} title="Food log" subtitle="Type what you ate in plain words: AI works out the nutrition." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="card space-y-4 lg:sticky lg:top-8">
          <div>
            <h2 className="section-title">Log a meal</h2>
            <p className="muted text-sm">Describe it like you would to a friend.</p>
          </div>
          <textarea
            className="input min-h-28 resize-y"
            placeholder="e.g. 1 masala dosa with sambar and coconut chutney, filter coffee with sugar"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="sm:flex-1" onClick={parse} loading={loading} disabled={!text.trim()}>
              <Sparkles className="h-4 w-4" /> Calculate nutrition
            </Button>
            <button
              className="btn-secondary"
              onClick={() => {
                setSource('manual');
                setItems((cur) => (cur.length ? cur : [blankItem()]));
              }}
            >
              <PencilLine className="h-4 w-4" /> Enter manually
            </button>
          </div>
          {items.length > 0 && (
            <div className="animate-fade-in space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <FoodItemsEditor items={items} onChange={setItems} />
              <AllergyAlert items={items} />
              <SaveToLog key={formKey} items={items.filter((i) => i.name.trim())} source={source} onSaved={reset} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="section-title mb-3">Last 7 days</h2>
            <ul className="space-y-1 text-sm">
              {history.map((h) => (
                <li key={h.date}>
                  <button
                    onClick={() => setDate(h.date)}
                    aria-pressed={h.date === date}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      h.date === date ? 'bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/20' : ''
                    }`}
                  >
                    <span className="w-24 font-medium">{prettyDate(h.date)}</span>
                    <span className="flex-1">
                      <span className="block h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span
                          className={`block h-full rounded-full ${h.totals.kcal > (targets?.kcal || 0) * 1.05 ? 'bg-red-500' : 'bg-gradient-to-r from-brand-500 to-accent-500'}`}
                          style={{ width: `${Math.min(100, (h.totals.kcal / (targets?.kcal || 1)) * 100)}%` }}
                        />
                      </span>
                    </span>
                    <span className="muted w-20 text-right tabular-nums">{fmt(h.totals.kcal)} kcal</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="section-title">{prettyDate(date)}</h2>
              <MacroLine t={sumLogs(logs)} className="text-sm" />
            </div>
            {!logs.length ? (
              <EmptyState icon={NotebookPen} title="Nothing logged" text="Log a meal, scan a photo or tick off a planned meal." />
            ) : (
              <div className="space-y-2.5">
                {logs.map((log) => {
                  const Icon = SOURCE_ICON[log.source] || NotebookPen;
                  return (
                    <div key={log.id} className="card flex animate-fade-in items-start gap-3.5 !p-3.5">
                      {log.thumb ? (
                        <img src={log.thumb} alt="" className="h-14 w-14 rounded-xl object-cover" />
                      ) : (
                        <div className="icon-tile h-14 w-14">
                          <Icon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {log.mealName}
                          <span className="muted text-xs font-normal">
                            {' '}
                            · {new Date(log.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                        <p className="muted truncate text-sm">{log.items.map((i) => i.name).join(', ')}</p>
                        <MacroLine t={sumItems(log.items)} className="text-xs" />
                      </div>
                      <button
                        className="icon-btn hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-500/10"
                        onClick={() => removeLog(date, log.id)}
                        aria-label="Delete log entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
