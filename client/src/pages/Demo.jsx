import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { WifiOff, PlayCircle, LogOut, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useApp } from '../store/useApp';
import { PageHeader } from '../components/ui';

// A suggested presentation script; every step works offline.
const STEPS = [
  { to: '/', title: 'Today dashboard', text: 'Calorie ring, macro bars, water tracker. Breakfast is already ticked off.' },
  { to: '/plan', title: 'Edit the diet plan', text: 'Remove the boiled egg, change a quantity, swap milk for a dairy-free option, then Undo.' },
  { to: '/plan', title: 'Generate a week', text: 'Press "Generate week" to fill the next 7 days with varied meals.' },
  { to: '/scan', title: 'Scan a meal photo', text: 'Tap "Try sample meal" (or upload any photo) and analyse calories and macros.' },
  { to: '/scan', title: 'Log it and adjust the day', text: 'Save the scan as Lunch "instead of" the planned lunch, then press "Adjust my day".' },
  { to: '/log', title: 'Log food in plain words', text: 'Type "2 roti, dal and a glass of buttermilk" and press Calculate.' },
  { to: '/coach', title: 'Ask the AI coach', text: 'Try "What should I eat for dinner to hit my protein target?"' },
  { to: '/grocery', title: 'Build a grocery list', text: 'Turn the planned meals into a grouped shopping list.' },
  { to: '/progress', title: 'Show progress', text: 'Two weeks of weight and calorie history with a logging streak.' },
];

export default function Demo() {
  const demoMode = useApp((s) => s.settings.demoMode);
  const enterDemo = useApp((s) => s.enterDemo);
  const exitDemo = useApp((s) => s.exitDemo);
  const navigate = useNavigate();

  const start = () => {
    enterDemo();
    toast.success('Offline demo started with sample data');
    navigate('/');
  };

  const stop = () => {
    exitDemo();
    toast('Demo ended. Your own data is back.');
    navigate('/');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={WifiOff}
        title="Offline demo"
        subtitle="Present HealthyFood with no internet connection and no API key."
      />

      <div className="relative flex flex-col gap-5 overflow-hidden rounded-[1.75rem] border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 shadow-soft sm:flex-row sm:items-center sm:p-6 dark:border-violet-500/20 dark:from-violet-500/10 dark:to-fuchsia-500/5">
        <div className="self-start rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-3.5 text-white shadow-[0_8px_24px_-6px_rgb(139_92_246/0.5)]">
          <WifiOff className="h-7 w-7" />
        </div>
        <div className="flex-1 text-sm">
          <p className="text-base font-semibold">{demoMode ? 'Demo mode is ON' : 'How it works'}</p>
          <p className="muted">
            Demo mode loads a sample user (Asha: eggetarian, losing weight, allergic to peanuts) with a meal plan and two
            weeks of history. Every AI feature answers instantly from a built-in engine: canned plans scaled to her
            targets, a small offline food database, sample photo analyses and coach answers. No request leaves the browser.
          </p>
          <p className="muted mt-2 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-brand-600" /> Your real profile and logs are backed up and restored when you exit.
          </p>
        </div>
        {demoMode ? (
          <button className="btn-secondary shrink-0" onClick={stop}>
            <LogOut className="h-4 w-4" /> Exit demo
          </button>
        ) : (
          <button className="btn shrink-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-[0_8px_24px_-6px_rgb(139_92_246/0.5)] hover:brightness-105" onClick={start}>
            <PlayCircle className="h-4 w-4" /> Start offline demo
          </button>
        )}
      </div>

      <div className="card">
        <h2 className="section-title mb-4">Demo script (about 3 minutes)</h2>
        <ol className="relative space-y-4 before:absolute before:bottom-3 before:left-[0.9rem] before:top-3 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
          {STEPS.map((s, i) => (
            <li key={i} className="relative flex gap-3.5">
              <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-600 text-xs font-bold text-white ring-4 ring-white dark:ring-slate-900">
                {i + 1}
              </span>
              <div className="pt-0.5 text-sm">
                {demoMode ? (
                  <Link to={s.to} className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
                    {s.title}
                  </Link>
                ) : (
                  <span className="font-semibold">{s.title}</span>
                )}
                <p className="muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="muted flex items-center gap-1.5 text-xs">
        <CheckCircle2 className="h-4 w-4" /> Tip: open the app once while online (or run it locally with <code>npm start</code>)
        so the page is cached; after that the demo works fully offline.
      </p>
    </div>
  );
}
