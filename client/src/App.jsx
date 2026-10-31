import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useApp } from './store/useApp';
import Layout from './components/Layout';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Plan from './pages/Plan';
import Scan from './pages/Scan';
import Log from './pages/Log';
import Coach from './pages/Coach';
import Grocery from './pages/Grocery';
import Settings from './pages/Settings';
import Demo from './pages/Demo';

// Recharts is large, so the charts page loads on demand.
const Progress = lazy(() => import('./pages/Progress'));

function useTheme() {
  const theme = useApp((s) => s.settings.theme);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}

export default function App() {
  useTheme();
  const hasProfile = useApp((s) => Boolean(s.profile));
  const location = useLocation();

  useEffect(() => {
    const onFull = () => toast.error('Browser storage is full. Export your data and delete old logs in Settings.', { id: 'storage' });
    window.addEventListener('healthyfood:storage-full', onFull);
    return () => window.removeEventListener('healthyfood:storage-full', onFull);
  }, []);

  const needsOnboarding = !hasProfile && !['/onboarding', '/settings', '/demo'].includes(location.pathname);

  return (
    <>
      <Toaster position="top-center" toastOptions={{ className: 'dark:!bg-stone-800 dark:!text-stone-100', duration: 3500 }} />
      {needsOnboarding ? (
        <Navigate to="/onboarding" replace />
      ) : (
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/log" element={<Log />} />
            <Route path="/coach" element={<Coach />} />
            <Route path="/grocery" element={<Grocery />} />
            <Route path="/progress" element={<Suspense fallback={null}><Progress /></Suspense>} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/demo" element={<Demo />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}
