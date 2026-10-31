import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Camera,
  NotebookPen,
  MessageCircle,
  ShoppingCart,
  LineChart,
  Settings as SettingsIcon,
  KeyRound,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../store/useApp';

const NAV = [
  { to: '/', label: 'Today', icon: LayoutDashboard, mobile: true },
  { to: '/plan', label: 'Diet plan', icon: CalendarDays, mobile: true },
  { to: '/scan', label: 'Scan food', icon: Camera, mobile: true },
  { to: '/log', label: 'Food log', icon: NotebookPen },
  { to: '/coach', label: 'AI coach', icon: MessageCircle, mobile: true },
  { to: '/grocery', label: 'Grocery list', icon: ShoppingCart },
  { to: '/progress', label: 'Progress', icon: LineChart },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, mobile: true },
  { to: '/demo', label: 'Offline demo', icon: WifiOff },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
      <img src="/icon.svg" alt="" className="h-8 w-8" />
      <span className="text-lg">HealthyFood</span>
    </Link>
  );
}

export function ApiKeyBanner() {
  const hasKey = useApp((s) => Boolean(s.settings.apiKey));
  const demoMode = useApp((s) => s.settings.demoMode);
  if (hasKey || demoMode) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <KeyRound className="h-5 w-5 shrink-0" />
      <span className="flex-1">
        Add your free OpenRouter API key to turn on the AI features. It is saved only in this browser.
      </span>
      <Link to="/settings" className="btn-primary !py-1.5">
        Add API key
      </Link>
    </div>
  );
}

function DemoBanner() {
  const demoMode = useApp((s) => s.settings.demoMode);
  if (!demoMode) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
      <WifiOff className="h-5 w-5 shrink-0" />
      <span className="flex-1">
        <strong>Offline demo mode:</strong> sample data, with AI answers generated locally. No internet needed.
      </span>
      <Link to="/demo" className="btn-secondary !py-1.5">
        Demo script / exit
      </Link>
    </div>
  );
}

export default function Layout() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-brand-100 text-brand-700 dark:bg-brand-700/20 dark:text-brand-400'
        : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
    }`;

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-stone-200 bg-white px-3 py-5 dark:border-stone-800 dark:bg-stone-900 lg:flex">
        <div className="mb-6 px-2">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="muted mt-auto px-2 text-xs">
          Open source · MIT · AI estimates are approximate and not medical advice.
        </p>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90 lg:hidden">
        <Logo />
        <div className="flex gap-1">
          <NavLink to="/log" className="icon-btn" aria-label="Food log">
            <NotebookPen className="h-5 w-5" />
          </NavLink>
          <NavLink to="/grocery" className="icon-btn" aria-label="Grocery list">
            <ShoppingCart className="h-5 w-5" />
          </NavLink>
          <NavLink to="/demo" className="icon-btn" aria-label="Offline demo">
            <WifiOff className="h-5 w-5" />
          </NavLink>
          <NavLink to="/progress" className="icon-btn" aria-label="Progress">
            <LineChart className="h-5 w-5" />
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
        <DemoBanner />
        <ApiKeyBanner />
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-stone-800 dark:bg-stone-900 lg:hidden">
        {NAV.filter((n) => n.mobile).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-stone-500'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
