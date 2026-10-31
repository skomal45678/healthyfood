import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Flame, TrendingDown, Scale, TrendingUp, Dumbbell, ChevronLeft, ChevronRight, Check, User, Target, Salad } from 'lucide-react';
import { useApp } from '../store/useApp';
import { ACTIVITY, DIET_TYPES, GOALS, bmi, calcTargets } from '../lib/nutrition';
import { splitList } from '../lib/utils';
import { Field, Segmented } from '../components/ui';

const DEFAULTS = {
  name: '',
  age: 25,
  sex: 'male',
  heightCm: 170,
  weightKg: 70,
  targetWeightKg: '',
  activity: 'light',
  goal: 'lose',
  pace: 'normal',
  dietType: 'vegetarian',
  cuisine: 'Indian',
  allergies: '',
  dislikes: '',
  mealsPerDay: 4,
  budget: 'moderate',
  notes: '',
};

const GOAL_ICONS = { lose: TrendingDown, maintain: Scale, gain: TrendingUp, muscle: Dumbbell };

const STEPS = [
  { title: 'About you', icon: User },
  { title: 'Your goal', icon: Target },
  { title: 'Food preferences', icon: Salad },
];

// Same checks as on submit, so the user is stopped on the step with the problem.
function bodyError(profile) {
  if (!(profile.age >= 13 && profile.age <= 100)) return 'Age must be between 13 and 100';
  if (!(profile.heightCm >= 100 && profile.heightCm <= 250)) return 'Height must be 100–250 cm';
  if (!(profile.weightKg >= 30 && profile.weightKg <= 300)) return 'Weight must be 30–300 kg';
  return null;
}

const toForm = (p) =>
  p ? { ...DEFAULTS, ...p, allergies: (p.allergies || []).join(', '), dislikes: (p.dislikes || []).join(', ') } : DEFAULTS;

function OptionButton({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border text-left transition ${
        active
          ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-500/10 dark:bg-brand-500/10'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function Onboarding() {
  const existing = useApp((s) => s.profile);
  const saveProfile = useApp((s) => s.saveProfile);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => toForm(existing));
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pick = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const profile = useMemo(
    () => ({
      ...form,
      age: Number(form.age),
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
      mealsPerDay: Number(form.mealsPerDay),
      allergies: splitList(form.allergies),
      dislikes: splitList(form.dislikes),
      name: form.name.trim(),
      notes: form.notes.trim(),
    }),
    [form]
  );
  const targets = calcTargets(profile);
  const bmiInfo = bmi(profile);

  const goTo = (next) => {
    if (next > 0 && step === 0) {
      const err = bodyError(profile);
      if (err) return toast.error(err);
    }
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!last && !existing) return goTo(step + 1);
    const err = bodyError(profile);
    if (err) {
      setStep(0);
      return toast.error(err);
    }
    saveProfile(profile);
    toast.success(existing ? 'Profile updated' : 'Profile saved! Now generate your plan.');
    navigate(existing ? '/' : '/plan');
  };

  const preview = targets && (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-accent-600 p-5 text-white shadow-glow">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <p className="flex items-center gap-2 text-sm font-medium text-white/85">
          <Flame className="h-4 w-4" /> Your daily targets
        </p>
        <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
          {targets.kcal}
          <span className="text-base font-medium text-white/80"> kcal</span>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ['Protein', targets.protein],
            ['Carbs', targets.carbs],
            ['Fat', targets.fat],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/15 px-2 py-2.5 ring-1 ring-white/20">
              <p className="text-lg font-bold tabular-nums">{v} g</p>
              <p className="text-[11px] text-white/80">{k}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-white/80">
          BMR {targets.bmr} · TDEE {targets.tdee} kcal · fiber {targets.fiber} g · water {targets.waterMl / 1000} L
          {bmiInfo && ` · BMI ${bmiInfo.value} (${bmiInfo.label})`}
        </p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:pb-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-11 w-11 rounded-2xl shadow-glow" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{existing ? 'Edit your profile' : 'Welcome to HealthyFood'}</h1>
            <p className="muted text-sm">Tell us about yourself and your goal. Everything is stored only in this browser.</p>
          </div>
        </div>
        {!existing && (
          <Link to="/demo" className="btn-secondary !text-violet-700 dark:!text-violet-300">
            Just exploring? Try the offline demo →
          </Link>
        )}
      </div>

      <ol className="mb-6 grid grid-cols-3 gap-2">
        {STEPS.map(({ title, icon: Icon }, i) => {
          const done = i < step;
          const active = i === step;
          const reachable = existing || i <= step + 1;
          return (
            <li key={title}>
              <button
                type="button"
                onClick={() => reachable && i !== step && goTo(i)}
                disabled={!reachable}
                className="w-full text-left disabled:cursor-default"
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={`mb-2 block h-1.5 rounded-full transition ${
                    done || active ? 'bg-gradient-to-r from-brand-500 to-accent-500' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
                <span className={`flex items-center gap-2 text-xs font-semibold sm:text-sm ${active ? '' : 'muted'}`}>
                  <span
                    className={`hidden h-6 w-6 items-center justify-center rounded-lg sm:inline-flex ${
                      done || active ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400' : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  {title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div key={step} className="animate-fade-in space-y-5">
          {step === 0 && (
            <section className="card grid gap-4 sm:grid-cols-2">
              <Field label="Name (optional)">
                <input className="input" value={form.name} onChange={set('name')} placeholder="Your name" />
              </Field>
              <Field label="Age">
                <input className="input" type="number" min="13" max="100" required value={form.age} onChange={set('age')} />
              </Field>
              <div className="sm:col-span-2">
                <span className="label">Sex</span>
                <Segmented
                  className="w-full"
                  value={form.sex}
                  onChange={(v) => pick('sex', v)}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </div>
              <Field label="Height (cm)">
                <input className="input" type="number" min="100" max="250" required value={form.heightCm} onChange={set('heightCm')} />
              </Field>
              <Field label="Weight (kg)" hint={bmiInfo ? `BMI ${bmiInfo.value} · ${bmiInfo.label}` : undefined}>
                <input className="input" type="number" step="0.1" min="30" max="300" required value={form.weightKg} onChange={set('weightKg')} />
              </Field>
              <div className="sm:col-span-2">
                <span className="label">Activity level</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(ACTIVITY).map(([k, v]) => {
                    const [title, detail] = v.label.split(' (');
                    return (
                      <OptionButton key={k} active={form.activity === k} onClick={() => pick('activity', k)} className="px-3.5 py-3">
                        <span className="block text-sm font-semibold">{title}</span>
                        {detail && <span className="muted block text-xs">{detail.replace(/\)$/, '')}</span>}
                      </OptionButton>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="card space-y-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(GOALS).map(([k, v]) => {
                  const Icon = GOAL_ICONS[k] || Target;
                  const active = form.goal === k;
                  return (
                    <OptionButton
                      key={k}
                      active={active}
                      onClick={() => pick('goal', k)}
                      className={`flex flex-col items-center gap-2 px-3 py-4 !text-center text-sm font-semibold ${active ? 'text-brand-700 dark:text-brand-300' : ''}`}
                    >
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                          active ? 'bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-glow' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      {v.label}
                    </OptionButton>
                  );
                })}
              </div>
              {form.goal !== 'maintain' && (
                <div>
                  <span className="label">Pace</span>
                  <Segmented
                    className="w-full"
                    value={form.pace}
                    onChange={(v) => pick('pace', v)}
                    options={[
                      { value: 'slow', label: 'Slow & steady' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'fast', label: 'Fast' },
                    ]}
                  />
                </div>
              )}
              <div className="sm:max-w-xs">
                <Field label="Target weight (kg, optional)">
                  <input className="input" type="number" step="0.1" value={form.targetWeightKg} onChange={set('targetWeightKg')} />
                </Field>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="card grid gap-4 sm:grid-cols-2">
              <Field label="Diet type">
                <select className="input" value={form.dietType} onChange={set('dietType')}>
                  {Object.entries(DIET_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Preferred cuisine">
                <input className="input" value={form.cuisine} onChange={set('cuisine')} placeholder="Indian, Mediterranean, Mexican…" />
              </Field>
              <Field label="Allergies" hint="Comma separated, e.g. peanut, milk, gluten">
                <input className="input" value={form.allergies} onChange={set('allergies')} />
              </Field>
              <Field label="Foods to avoid" hint="Comma separated, e.g. egg, mushroom">
                <input className="input" value={form.dislikes} onChange={set('dislikes')} />
              </Field>
              <div>
                <span className="label">Meals per day</span>
                <Segmented
                  className="w-full"
                  value={Number(form.mealsPerDay)}
                  onChange={(v) => pick('mealsPerDay', v)}
                  options={[3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
                />
              </div>
              <div>
                <span className="label">Budget</span>
                <Segmented
                  className="w-full"
                  value={form.budget}
                  onChange={(v) => pick('budget', v)}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'high', label: 'No limit' },
                  ]}
                />
              </div>
              <div className="sm:col-span-2">
                <Field label="Anything else? (optional)" hint="e.g. I work night shifts, I have no oven, I'm training for a 10K">
                  <textarea className="input min-h-20" value={form.notes} onChange={set('notes')} />
                </Field>
              </div>
            </section>
          )}

          <div className="lg:hidden">{preview}</div>
        </div>

        <aside className="hidden lg:sticky lg:top-8 lg:row-span-2 lg:block">{preview}</aside>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/85 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none dark:border-slate-800 dark:bg-slate-950/85 lg:dark:bg-transparent">
          <div className="mx-auto flex max-w-5xl gap-2">
            {step > 0 ? (
              <button type="button" className="btn-secondary" onClick={() => goTo(step - 1)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              existing && (
                <Link to="/" className="btn-secondary">
                  Cancel
                </Link>
              )
            )}
            <div className="flex-1" />
            {existing && !last && (
              <button type="button" className="btn-secondary" onClick={() => goTo(step + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <button type="submit" className="btn-primary min-w-32">
              {existing ? (
                'Save profile'
              ) : last ? (
                <>
                  <Check className="h-4 w-4" /> Finish
                </>
              ) : (
                <>
                  Continue <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
