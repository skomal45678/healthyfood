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
        title="Offline demo"
        subtitle="Present HealthyFood with no internet connection and no API key."
      />

      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="rounded-full bg-violet-100 p-3 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          <WifiOff className="h-7 w-7" />
        </div>
        <div className="flex-1 text-sm">
          <p className="font-semibold">{demoMode ? 'Demo mode is ON' : 'How it works'}</p>
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
          <button className="btn-primary shrink-0 !bg-violet-600 hover:!bg-violet-700" onClick={start}>
            <PlayCircle className="h-4 w-4" /> Start offline demo
          </button>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Demo script (about 3 minutes)</h2>
        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-700/20 dark:text-brand-400">
                {i + 1}
              </span>
              <div className="text-sm">
                {demoMode ? (
                  <Link to={s.to} className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                    {s.title}
                  </Link>
                ) : (
                  <span className="font-medium">{s.title}</span>
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
