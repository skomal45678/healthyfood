import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
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
  Menu,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../store/useApp';
import { Modal } from './ui';

const NAV_GROUPS = [
  {
    title: 'Track',
    items: [
      { to: '/', label: 'Today', icon: LayoutDashboard },
      { to: '/scan', label: 'Scan food', icon: Camera },
      { to: '/log', label: 'Food log', icon: NotebookPen },
    ],
  },
  {
    title: 'Plan',
    items: [
      { to: '/plan', label: 'Diet plan', icon: CalendarDays },
      { to: '/grocery', label: 'Grocery list', icon: ShoppingCart },
      { to: '/coach', label: 'AI coach', icon: MessageCircle },
    ],
  },
  {
    title: 'Insights',
    items: [{ to: '/progress', label: 'Progress', icon: LineChart }],
  },
  {
    title: 'App',
    items: [
      { to: '/settings', label: 'Settings', icon: SettingsIcon },
      { to: '/demo', label: 'Offline demo', icon: WifiOff },
    ],
  },
];

const MOBILE_TABS = [
  { to: '/', label: 'Today', icon: LayoutDashboard },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/scan', label: 'Scan', icon: Camera, primary: true },
  { to: '/coach', label: 'Coach', icon: MessageCircle },
];

const MORE_PATHS = ['/log', '/grocery', '/progress', '/settings', '/demo'];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
      <img src="/icon.svg" alt="" className="h-9 w-9 rounded-xl shadow-glow" />
      <span className="text-lg">
        Healthy<span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">Food</span>
      </span>
    </Link>
  );
}

function Banner({ tone, icon: Icon, children, action }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100',
    violet: 'border-violet-200 bg-violet-50/90 text-violet-900 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-100',
  };
  const tiles = {
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  };
  return (
    <div className={`mb-5 flex flex-col gap-3 rounded-2xl border p-3.5 text-sm shadow-soft sm:flex-row sm:items-center ${tones[tone]}`}>
      <div className="flex flex-1 items-start gap-3 sm:items-center">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tiles[tone]}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="flex-1 leading-snug">{children}</span>
      </div>
      {action}
    </div>
  );
}

export function ApiKeyBanner() {
  const hasKey = useApp((s) => Boolean(s.settings.apiKey));
  const demoMode = useApp((s) => s.settings.demoMode);
  if (hasKey || demoMode) return null;
  return (
    <Banner
      tone="amber"
      icon={KeyRound}
      action={
        <Link to="/settings" className="btn-primary !min-h-9 !py-1.5">
          Add API key
        </Link>
      }
    >
      Add your free OpenRouter API key to turn on the AI features. It is saved only in this browser.
    </Banner>
  );
}

function DemoBanner() {
  const demoMode = useApp((s) => s.settings.demoMode);
  if (!demoMode) return null;
  return (
    <Banner
      tone="violet"
      icon={WifiOff}
      action={
        <Link to="/demo" className="btn-secondary !min-h-9 !py-1.5">
          Demo script / exit
        </Link>
      }
    >
      <strong>Offline demo mode:</strong> sample data, with AI answers generated locally. No internet needed.
    </Banner>
  );
}

function ProfileCard() {
  const profile = useApp((s) => s.profile);
  if (!profile) return null;
  const initial = (profile.name || 'You').trim().charAt(0).toUpperCase();
  return (
    <Link
      to="/onboarding"
      className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-2.5 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 text-sm font-bold text-white">
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{profile.name || 'Your profile'}</span>
        <span className="muted block truncate text-xs capitalize">Goal: {profile.goal}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}

const sideLink = ({ isActive }) =>
  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-gradient-to-r from-brand-500 to-accent-600 text-white shadow-glow'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
  }`;

export default function Layout() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_PATHS.includes(location.pathname);

  useEffect(() => {
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 p-4 lg:block">
        <div className="card flex h-full flex-col !p-4">
          <div className="mb-6 px-1.5 pt-1">
            <Logo />
          </div>
          <nav className="no-scrollbar -mx-1 flex-1 space-y-5 overflow-y-auto px-1" aria-label="Main">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</p>
                <div className="space-y-0.5">
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} end={to === '/'} className={sideLink}>
                      <Icon className="h-[18px] w-[18px]" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-4 space-y-3">
            <ProfileCard />
            <p className="muted px-1 text-[11px] leading-relaxed">
              Open source · MIT · AI estimates are approximate and not medical advice.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/60 bg-white/75 px-4 py-2.5 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/70 lg:hidden">
        <Logo />
        <button className="icon-btn" onClick={() => setMoreOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        <DemoBanner />
        <ApiKeyBanner />
        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 grid grid-cols-5 items-end rounded-3xl border border-slate-200/70 bg-white/85 px-1 py-1.5 shadow-lift backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 lg:hidden"
      >
        {MOBILE_TABS.map(({ to, label, icon: Icon, primary }) =>
          primary ? (
            <NavLink key={to} to={to} aria-label={label} className="flex flex-col items-center gap-1">
              {({ isActive }) => (
                <>
                  <span
                    className={`-mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-glow ring-4 ring-slate-50 transition active:scale-95 dark:ring-slate-950 ${
                      isActive ? 'scale-105' : ''
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className={`text-[11px] font-semibold ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>{label}</span>
                </>
              )}
            </NavLink>
          ) : (
            <TabLink key={to} to={to} label={label} icon={Icon} />
          )
        )}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-semibold ${
            moreActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
          }`}
        >
          <Menu className="h-5 w-5" />
          More
          <span className={`h-1 w-1 rounded-full ${moreActive ? 'bg-brand-500' : 'bg-transparent'}`} />
        </button>
      </nav>

      {/* Mobile "more" sheet */}
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu">
        <div className="space-y-5">
          <ProfileCard />
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</p>
              <div className="grid grid-cols-3 gap-2">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-xs font-medium transition ${
                        isActive
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          <p className="muted text-center text-[11px]">Open source · MIT · AI estimates are approximate and not medical advice.</p>
        </div>
      </Modal>
    </div>
  );
}

function TabLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-semibold transition ${
          isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
          {label}
          <span className={`h-1 w-1 rounded-full ${isActive ? 'bg-brand-500' : 'bg-transparent'}`} />
        </>
      )}
    </NavLink>
  );
}
