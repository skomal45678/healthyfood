import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Trash2, Bot } from 'lucide-react';
import { useApp } from '../store/useApp';
import { api, profileForAI } from '../lib/api';
import { useDayLogs, useTargets } from '../lib/hooks';
import { dayState } from '../lib/day';
import { dateKey } from '../lib/utils';
import { PageHeader, Spinner } from '../components/ui';

const SUGGESTIONS = [
  'What should I eat for dinner to hit my protein target?',
  'Give me 5 high-protein vegetarian snacks under 200 kcal',
  'How can I reduce sugar cravings in the evening?',
  'Is my plan today balanced? What would you change?',
];

// Minimal formatting: **bold**, bullet lines and paragraphs.
function Formatted({ text }) {
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const bullet = /^[-*•]\s+/.test(trimmed);
        const content = trimmed.replace(/^[-*•]\s+/, '').replace(/^#+\s*/, '');
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') && p.endsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p
        );
        return bullet ? (
          <p key={i} className="flex gap-2">
            <span>•</span>
            <span>{parts}</span>
          </p>
        ) : (
          <p key={i}>{parts}</p>
        );
      })}
    </div>
  );
}

export default function Coach() {
  const date = dateKey();
  const chat = useApp((s) => s.chat);
  const pushChat = useApp((s) => s.pushChat);
  const clearChat = useApp((s) => s.clearChat);
  const profile = useApp((s) => s.profile);
  const plan = useApp((s) => s.plans[date]);
  const logs = useDayLogs(date);
  const water = useApp((s) => s.water[date] || 0);
  const targets = useTargets();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.length, loading]);

  const send = async (text = input) => {
    const content = text.trim();
    if (!content || loading) return;
    const userMsg = { role: 'user', content };
    pushChat(userMsg);
    setInput('');
    setLoading(true);
    const { consumed, remainingMeals } = dayState(plan, logs);
    const round = (t) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v)]));
    try {
      const res = await api.coach({
        messages: [...chat, userMsg].slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 3900) })),
        context: {
          profile: profileForAI(profile),
          dailyTargets: targets,
          eatenToday: round(consumed),
          waterTodayMl: water,
          todaysLogs: logs.map((l) => ({ meal: l.mealName, items: l.items.map((i) => `${i.qty} ${i.unit} ${i.name}`) })),
          remainingPlannedMeals: remainingMeals.map((m) => ({ meal: m.name, items: m.items.map((i) => i.name) })),
          localTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      });
      pushChat({ role: 'assistant', content: res.reply });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col lg:h-[calc(100vh-8rem)]">
      <PageHeader
        title="AI nutrition coach"
        subtitle="Knows your goal, today's food and your plan."
        actions={
          chat.length > 0 && (
            <button className="btn-ghost" onClick={clearChat}>
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          )
        }
      />

      <div className="card flex-1 space-y-4 overflow-y-auto">
        {!chat.length && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot className="h-10 w-10 text-brand-600" />
            <p className="muted max-w-sm text-sm">Ask anything about food, your plan, cravings, eating out or recipes.</p>
            <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="btn-secondary !justify-start text-left !font-normal">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-stone-100 dark:bg-stone-800'
              }`}
            >
              {m.role === 'user' ? m.content : <Formatted text={m.content} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="muted flex items-center gap-2 text-sm">
            <Spinner /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input className="input" placeholder="Ask your coach…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="btn-primary" disabled={!input.trim() || loading} aria-label="Send">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
