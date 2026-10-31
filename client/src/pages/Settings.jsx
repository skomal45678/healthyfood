import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, ExternalLink, CheckCircle2, Download, Upload, Trash2, Cpu, Palette, ShieldCheck, UserRound, Sun, Moon, Monitor, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { useApp } from '../store/useApp';
import { api } from '../lib/api';
import { downloadJson, dateKey } from '../lib/utils';
import { Button, Field, PageHeader, Badge, Segmented } from '../components/ui';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="card space-y-4">
      <h2 className="section-title flex items-center gap-3">
        <span className="icon-tile h-9 w-9">
          <Icon className="h-4.5 w-4.5" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ApiKeySection() {
  const savedKey = useApp((s) => s.settings.apiKey);
  const updateSettings = useApp((s) => s.updateSettings);
  const [key, setKey] = useState(savedKey);
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [info, setInfo] = useState(null);

  const test = async (k = key) => {
    setTesting(true);
    setInfo(null);
    try {
      const res = await api.validateKey(k.trim());
      setInfo(res);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    const trimmed = key.trim();
    if (!trimmed) return toast.error('Paste your key first');
    if (await test(trimmed)) {
      updateSettings({ apiKey: trimmed });
      toast.success('API key saved in this browser');
    }
  };

  return (
    <Section icon={KeyRound} title="OpenRouter API key">
      <p className="muted text-sm">
        HealthyFood uses free AI models on OpenRouter. Create a free key at{' '}
        <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          openrouter.ai/keys <ExternalLink className="inline h-3 w-3" />
        </a>
        . The key is stored only in this browser&apos;s localStorage and sent to our server with each AI request, which passes it straight to OpenRouter. It is never saved or logged on the server.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            className="input !pr-12 font-mono"
            placeholder="sk-or-v1-…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-label="OpenRouter API key"
          />
          <button type="button" className="icon-btn absolute right-0.5 top-0.5" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide key' : 'Show key'}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button onClick={save} loading={testing}>
          Save
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {savedKey ? <Badge tone="green">Key saved</Badge> : <Badge tone="amber">No key saved</Badge>}
        {savedKey && (
          <>
            <button className="btn-ghost !min-h-9 !py-1" onClick={() => test(savedKey)} disabled={testing}>
              Test saved key
            </button>
            <button
              className="btn-ghost !min-h-9 !py-1 !text-red-600"
              onClick={() => {
                updateSettings({ apiKey: '' });
                setKey('');
                setInfo(null);
                toast('API key removed');
              }}
            >
              Remove key
            </button>
          </>
        )}
      </div>
      {info && (
        <p className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-400">
          <CheckCircle2 className="h-4 w-4" /> Key works{info.label ? ` (${info.label})` : ''}
          {info.isFreeTier != null && ` · ${info.isFreeTier ? 'free tier' : 'paid account'}`}
        </p>
      )}
    </Section>
  );
}

function ModelSection() {
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const [models, setModels] = useState(null);

  useEffect(() => {
    api
      .models()
      .then(setModels)
      .catch(() => toast.error('Could not load the model list'));
  }, []);

  const select = (field, list, label) => (
    <Field label={label} hint={`${list?.length ?? '…'} free models available right now`}>
      <select className="input" value={settings[field]} onChange={(e) => updateSettings({ [field]: e.target.value })}>
        <option value="">Auto (recommended, with fallbacks)</option>
        {list?.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} {m.context ? `· ${Math.round(m.context / 1000)}k ctx` : ''}
          </option>
        ))}
        {settings[field] && list && !list.some((m) => m.id === settings[field]) && <option value={settings[field]}>{settings[field]} (unavailable)</option>}
      </select>
    </Field>
  );

  return (
    <Section icon={Cpu} title="AI models">
      <p className="muted text-sm">
        Only <strong>free</strong> OpenRouter models are listed, fetched live. If your choice is busy or rate-limited, HealthyFood falls back to other free models automatically.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {select('textModel', models?.text, 'Text model (plans, coach, parsing)')}
        {select('visionModel', models?.vision, 'Vision model (food photos)')}
      </div>
      {models?.defaults && (
        <p className="muted text-xs">
          Auto uses {models.defaults.text} for text and {models.defaults.vision} for photos.
        </p>
      )}
    </Section>
  );
}

function DataSection() {
  const exportData = useApp((s) => s.exportData);
  const importData = useApp((s) => s.importData);
  const resetData = useApp((s) => s.resetData);
  const fileRef = useRef(null);

  const onImport = async (file) => {
    if (!file) return;
    try {
      importData(JSON.parse(await file.text()));
      toast.success('Backup restored');
    } catch (err) {
      toast.error(err.message || 'Invalid backup file');
    } finally {
      fileRef.current.value = '';
    }
  };

  return (
    <Section icon={ShieldCheck} title="Your data">
      <p className="muted text-sm">
        Your profile, plans and logs live only in this browser: there are no accounts and no server database. Export a backup to move to another device. Backups never include your API key.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => downloadJson(`healthyfood-backup-${dateKey()}.json`, exportData())}>
          <Download className="h-4 w-4" /> Export backup
        </button>
        <button className="btn-secondary" onClick={() => fileRef.current.click()}>
          <Upload className="h-4 w-4" /> Import backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
        <button
          className="btn-ghost !text-red-600 hover:!bg-red-50 dark:hover:!bg-red-500/10"
          onClick={() => {
            if (window.confirm('Delete your profile, plans, logs and chat from this browser? Your API key is kept.')) {
              resetData();
              toast('All data cleared');
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Reset all data
        </button>
      </div>
    </Section>
  );
}

export default function Settings() {
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const hasProfile = useApp((s) => Boolean(s.profile));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="AI access, models, appearance and your data." />
      <ApiKeySection />
      <ModelSection />

      <Section icon={Palette} title="Preferences">
        <div>
          <span className="label">Theme</span>
          <Segmented
            className="w-full sm:w-auto"
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: 'system', label: 'System', icon: Monitor },
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
            ]}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
          <span className="flex-1 text-sm">
            <span className="font-semibold">Auto-adjust my day</span>
            <span className="muted block">After logging food, open the AI re-balancing of the remaining meals right away.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={settings.autoAdjust}
            onChange={(e) => updateSettings({ autoAdjust: e.target.checked })}
          />
          <span
            aria-hidden
            className={`relative h-7 w-12 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 ${
              settings.autoAdjust ? 'bg-gradient-to-r from-brand-500 to-accent-600' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${settings.autoAdjust ? 'left-6' : 'left-1'}`}
            />
          </span>
        </label>
      </Section>

      <Section icon={UserRound} title="Profile">
        <Link to="/onboarding" className="btn-secondary w-full !justify-between sm:w-auto">
          {hasProfile ? 'Edit profile & goals' : 'Create profile'}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Section>

      <DataSection />

      <p className="muted text-center text-xs">
        HealthyFood is open source (MIT). AI nutrition values are estimates and not medical advice; consult a professional for medical conditions.
      </p>
    </div>
  );
}
