import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, ExternalLink, CheckCircle2, Download, Upload, Trash2, Cpu, Palette, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../store/useApp';
import { api } from '../lib/api';
import { downloadJson, dateKey } from '../lib/utils';
import { Button, Field, PageHeader, Badge } from '../components/ui';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="card space-y-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon className="h-5 w-5 text-brand-600" /> {title}
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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            className="input pr-10 font-mono"
            placeholder="sk-or-v1-…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-label="OpenRouter API key"
          />
          <button type="button" className="icon-btn absolute right-1 top-1" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide key' : 'Show key'}>
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
            <button className="btn-ghost !py-1" onClick={() => test(savedKey)} disabled={testing}>
              Test saved key
            </button>
            <button
              className="btn-ghost !py-1 text-red-600"
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
          className="btn-ghost text-red-600"
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
    <div className="space-y-5">
      <PageHeader title="Settings" />
      <ApiKeySection />
      <ModelSection />

      <Section icon={Palette} title="Preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Theme">
            <select className="input" value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value })}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
          <label className="flex items-start gap-3 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
            <input
              type="checkbox"
              className="mt-1 accent-brand-600"
              checked={settings.autoAdjust}
              onChange={(e) => updateSettings({ autoAdjust: e.target.checked })}
            />
            <span className="text-sm">
              <span className="font-medium">Auto-adjust my day</span>
              <span className="muted block">After logging food, open the AI re-balancing of the remaining meals right away.</span>
            </span>
          </label>
        </div>
      </Section>

      <Section icon={UserRound} title="Profile">
        <Link to="/onboarding" className="btn-secondary">
          {hasProfile ? 'Edit profile & goals' : 'Create profile'}
        </Link>
      </Section>

      <DataSection />

      <p className="muted text-center text-xs">
        HealthyFood is open source (MIT). AI nutrition values are estimates and not medical advice; consult a professional for medical conditions.
      </p>
    </div>
  );
}
