import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Target, Flame } from 'lucide-react';
import { useApp } from '../store/useApp';
import { ACTIVITY, DIET_TYPES, GOALS, bmi, calcTargets } from '../lib/nutrition';
import { splitList } from '../lib/utils';
import { Field } from '../components/ui';
import { MacroLine } from '../components/Macros';

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

const toForm = (p) =>
  p ? { ...DEFAULTS, ...p, allergies: (p.allergies || []).join(', '), dislikes: (p.dislikes || []).join(', ') } : DEFAULTS;

export default function Onboarding() {
  const existing = useApp((s) => s.profile);
  const saveProfile = useApp((s) => s.saveProfile);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => toForm(existing));

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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

  const submit = (e) => {
    e.preventDefault();
    if (!(profile.age >= 13 && profile.age <= 100)) return toast.error('Age must be between 13 and 100');
    if (!(profile.heightCm >= 100 && profile.heightCm <= 250)) return toast.error('Height must be 100–250 cm');
    if (!(profile.weightKg >= 30 && profile.weightKg <= 300)) return toast.error('Weight must be 30–300 kg');
    saveProfile(profile);
    toast.success(existing ? 'Profile updated' : 'Profile saved! Now generate your plan.');
    navigate(existing ? '/' : '/plan');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <img src="/icon.svg" alt="" className="h-10 w-10" />
        <div>
          <h1 className="text-2xl font-bold">{existing ? 'Edit your profile' : 'Welcome to HealthyFood'}</h1>
          <p className="muted text-sm">
            Tell us about yourself and your goal. Everything is stored only in this browser.
          </p>
          {!existing && (
            <Link to="/demo" className="mt-1 inline-block text-sm font-medium text-violet-600 hover:underline dark:text-violet-400">
              Just exploring? Try the offline demo with sample data →
            </Link>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <section className="card grid gap-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">About you</h2>
          <Field label="Name (optional)">
            <input className="input" value={form.name} onChange={set('name')} placeholder="Your name" />
          </Field>
          <Field label="Age">
            <input className="input" type="number" min="13" max="100" required value={form.age} onChange={set('age')} />
          </Field>
          <Field label="Sex">
            <select className="input" value={form.sex} onChange={set('sex')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / prefer not to say</option>
            </select>
          </Field>
          <Field label="Height (cm)">
            <input className="input" type="number" min="100" max="250" required value={form.heightCm} onChange={set('heightCm')} />
          </Field>
          <Field label="Weight (kg)" hint={bmiInfo ? `BMI ${bmiInfo.value} · ${bmiInfo.label}` : undefined}>
            <input className="input" type="number" step="0.1" min="30" max="300" required value={form.weightKg} onChange={set('weightKg')} />
          </Field>
          <Field label="Activity level">
            <select className="input" value={form.activity} onChange={set('activity')}>
              {Object.entries(ACTIVITY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
        </section>

        <section className="card grid gap-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Your goal</h2>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-4">
            {Object.entries(GOALS).map(([k, v]) => (
              <button
                type="button"
                key={k}
                onClick={() => setForm((f) => ({ ...f, goal: k }))}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                  form.goal === k
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-400'
                    : 'border-stone-200 hover:border-stone-300 dark:border-stone-700'
                }`}
              >
                <Target className="mx-auto mb-1 h-5 w-5" />
                {v.label}
              </button>
            ))}
          </div>
          {form.goal !== 'maintain' && (
            <Field label="Pace">
              <select className="input" value={form.pace} onChange={set('pace')}>
                <option value="slow">Slow &amp; steady</option>
                <option value="normal">Normal (recommended)</option>
                <option value="fast">Fast</option>
              </select>
            </Field>
          )}
          <Field label="Target weight (kg, optional)">
            <input className="input" type="number" step="0.1" value={form.targetWeightKg} onChange={set('targetWeightKg')} />
          </Field>
        </section>

        <section className="card grid gap-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Food preferences</h2>
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
          <Field label="Meals per day">
            <select className="input" value={form.mealsPerDay} onChange={set('mealsPerDay')}>
              {[3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field label="Budget">
            <select className="input" value={form.budget} onChange={set('budget')}>
              <option value="low">Low / student</option>
              <option value="moderate">Moderate</option>
              <option value="high">No constraint</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Anything else? (optional)" hint="e.g. I work night shifts, I have no oven, I'm training for a 10K">
              <textarea className="input min-h-16" value={form.notes} onChange={set('notes')} />
            </Field>
          </div>
        </section>

        {targets && (
          <section className="card flex flex-wrap items-center gap-4 border-brand-200 bg-brand-50 dark:border-brand-700/40 dark:bg-brand-700/10">
            <Flame className="h-8 w-8 text-brand-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Your daily targets</p>
              <MacroLine t={targets} />
              <p className="muted text-xs">
                BMR {targets.bmr} · TDEE {targets.tdee} kcal · fiber {targets.fiber} g · water {targets.waterMl / 1000} L
              </p>
            </div>
          </section>
        )}

        <div className="flex justify-end gap-2">
          {existing && (
            <Link to="/" className="btn-secondary">
              Cancel
            </Link>
          )}
          <button type="submit" className="btn-primary">
            {existing ? 'Save profile' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
