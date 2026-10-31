import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, Trash2, Bot, Sparkles, MessageCircleQuestion } from 'lucide-react';
import { useApp } from '../store/useApp';
import { api, profileForAI } from '../lib/api';
import { useDayLogs, useTargets } from '../lib/hooks';
import { dayState } from '../lib/day';
import { dateKey } from '../lib/utils';
import { PageHeader } from '../components/ui';

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
  const boxRef = useRef(null);
  const hasChat = chat.length > 0; // the "Clear chat" button changes the header height
  const [boxHeight, setBoxHeight] = useState(null);

  // Fill the space between the chat's top edge and the bottom of the screen,
  // leaving room for the mobile tab bar. Banners above it vary in height.
  useLayoutEffect(() => {
    const fit = () => {
      const el = boxRef.current;
      if (!el) return;
      const gap = window.matchMedia('(min-width: 1024px)').matches ? 32 : 112;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setBoxHeight(Math.max(380, window.innerHeight - top - gap));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [hasChat]);

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
    <div className="flex flex-col">
      <PageHeader
        icon={Sparkles}
        title="AI nutrition coach"
        subtitle="Knows your goal, today's food and your plan."
        actions={
          chat.length > 0 && (
            <button className="btn-ghost" onClick={clearChat}>
              <Trash2 className="h-4 w-4" /> Clear chat
            </button>
          )
        }
      />

      <div ref={boxRef} className="card flex flex-col overflow-hidden !p-0" style={{ height: boxHeight ?? 480 }}>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {!chat.length && (
            <div className="flex h-full flex-col items-center justify-center gap-5 py-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 opacity-40 blur-2xl" />
                <div className="relative rounded-3xl bg-gradient-to-br from-brand-500 to-accent-600 p-4 text-white shadow-glow">
                  <Bot className="h-8 w-8" />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold">How can I help today?</p>
                <p className="muted mx-auto max-w-sm text-sm">Ask anything about food, your plan, cravings, eating out or recipes.</p>
              </div>
              <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="group flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-left text-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500/40"
                  >
                    <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {chat.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex animate-fade-in justify-end">
                <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-gradient-to-br from-brand-500 to-accent-600 px-4 py-2.5 text-sm text-white shadow-soft">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex animate-fade-in items-end gap-2">
                <span className="icon-tile mb-0.5 h-8 w-8 !rounded-full">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="max-w-[85%] rounded-3xl rounded-bl-lg bg-slate-100 px-4 py-2.5 text-sm leading-relaxed dark:bg-slate-800">
                  <Formatted text={m.content} />
                </div>
              </div>
            )
          )}
          {loading && (
            <div className="flex items-end gap-2" aria-live="polite">
              <span className="icon-tile h-8 w-8 !rounded-full">
                <Bot className="h-4 w-4" />
              </span>
              <div className="flex gap-1 rounded-3xl rounded-bl-lg bg-slate-100 px-4 py-3.5 dark:bg-slate-800">
                <span className="sr-only">Thinking…</span>
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="flex gap-2 border-t border-slate-100 bg-white/60 p-3 dark:border-slate-800 dark:bg-slate-900/60"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            className="input !rounded-2xl"
            placeholder="Ask your coach…"
            aria-label="Message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary !rounded-2xl !px-3.5" disabled={!input.trim() || loading} aria-label="Send">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
