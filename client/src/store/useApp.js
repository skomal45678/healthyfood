import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dateKey, uid } from '../lib/utils';
import { calcTargets } from '../lib/nutrition';
import { buildDemoSeed } from '../lib/demo';

export const STORAGE_KEY = 'healthyfood-store';
const DEMO_BACKUP_KEY = 'healthyfood-backup-before-demo';
const MAX_UNDO = 20;
const MAX_CHAT = 40;

// localStorage can be full (photo thumbnails) or blocked (private mode).
const safeStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      window.dispatchEvent(new Event('healthyfood:storage-full'));
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

const initialData = {
  settings: { apiKey: '', textModel: '', visionModel: '', theme: 'system', autoAdjust: false, demoMode: false },
  profile: null,
  plans: {}, // { [date]: { meals: [], tips: [], model, generatedAt } }
  logs: {}, // { [date]: [{ id, mealName, source, items, at, thumb, planMealId }] }
  water: {}, // { [date]: ml }
  weights: [], // [{ date, kg }]
  chat: [], // [{ role, content }]
  grocery: null, // { categories, checked: {}, createdAt }
};

// Everything lives in this one localStorage-backed store: no server database.
export const useApp = create(
  persist(
    (set, get) => ({
      ...initialData,
      undoStack: [], // not persisted

      // ---- settings -------------------------------------------------------
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      // ---- profile --------------------------------------------------------
      saveProfile: (profile) =>
        set((s) => {
          const weights = [...s.weights];
          const today = dateKey();
          if (profile.weightKg && !weights.some((w) => w.date === today)) {
            weights.push({ date: today, kg: profile.weightKg });
          }
          return { profile: { ...profile, updatedAt: Date.now() }, weights };
        }),
      addDislike: (food) =>
        set((s) => {
          const dislikes = new Set(s.profile?.dislikes || []);
          dislikes.add(food);
          return { profile: { ...s.profile, dislikes: [...dislikes] } };
        }),

      // ---- plans (with undo) ---------------------------------------------
      setPlan: (date, plan, { undoable = true } = {}) =>
        set((s) => ({
          plans: { ...s.plans, [date]: plan },
          undoStack: undoable
            ? [...s.undoStack, { date, plan: s.plans[date] ?? null }].slice(-MAX_UNDO)
            : s.undoStack,
        })),
      updateMeals: (date, fn) => {
        const plan = get().plans[date];
        if (!plan) return;
        get().setPlan(date, { ...plan, meals: fn(plan.meals), editedAt: Date.now() });
      },
      undo: () => {
        const stack = get().undoStack;
        const last = stack[stack.length - 1];
        if (!last) return false;
        set((s) => {
          const plans = { ...s.plans };
          if (last.plan) plans[last.date] = last.plan;
          else delete plans[last.date];
          return { plans, undoStack: stack.slice(0, -1) };
        });
        return true;
      },
      deletePlan: (date) => get().setPlan(date, undefined),

      // ---- food log -------------------------------------------------------
      addLog: (date, entry) => {
        const full = { id: uid(), at: Date.now(), ...entry };
        set((s) => ({ logs: { ...s.logs, [date]: [...(s.logs[date] || []), full] } }));
        return full;
      },
      removeLog: (date, id) =>
        set((s) => ({ logs: { ...s.logs, [date]: (s.logs[date] || []).filter((l) => l.id !== id) } })),
      // Marking a planned meal as eaten logs its items; unmarking removes that log.
      togglePlanMealEaten: (date, meal) => {
        const logs = get().logs[date] || [];
        const existing = logs.find((l) => l.planMealId === meal.id);
        if (existing) get().removeLog(date, existing.id);
        else get().addLog(date, { mealName: meal.name, source: 'plan', planMealId: meal.id, items: meal.items });
      },

      // ---- water & weight -------------------------------------------------
      addWater: (date, ml) =>
        set((s) => ({ water: { ...s.water, [date]: Math.max(0, (s.water[date] || 0) + ml) } })),
      logWeight: (date, kg) =>
        set((s) => {
          const weights = s.weights.filter((w) => w.date !== date);
          weights.push({ date, kg });
          weights.sort((a, b) => a.date.localeCompare(b.date));
          const profile = s.profile && date >= (s.weights.at(-1)?.date || '') ? { ...s.profile, weightKg: kg } : s.profile;
          return { weights, profile };
        }),

      // ---- coach chat -----------------------------------------------------
      pushChat: (msg) => set((s) => ({ chat: [...s.chat, msg].slice(-MAX_CHAT) })),
      clearChat: () => set({ chat: [] }),

      // ---- grocery --------------------------------------------------------
      setGrocery: (grocery) => set({ grocery }),
      toggleGrocery: (key) =>
        set((s) => ({
          grocery: { ...s.grocery, checked: { ...s.grocery.checked, [key]: !s.grocery.checked?.[key] } },
        })),

      // ---- data management -----------------------------------------------
      exportData: () => {
        const { settings, profile, plans, logs, water, weights, chat, grocery } = get();
        // Never export the API key.
        return { app: 'healthyfood', version: 1, exportedAt: new Date().toISOString(), settings: { ...settings, apiKey: '' }, profile, plans, logs, water, weights, chat, grocery };
      },
      importData: (data) => {
        if (data?.app !== 'healthyfood') throw new Error('This is not a HealthyFood backup file.');
        const keep = get().settings.apiKey;
        set({
          ...initialData,
          ...Object.fromEntries(Object.keys(initialData).filter((k) => k in data).map((k) => [k, data[k]])),
          settings: { ...initialData.settings, ...data.settings, apiKey: keep },
          undoStack: [],
        });
      },
      // ---- offline demo ---------------------------------------------------
      // Back up the real data, load sample data, and answer AI calls locally.
      enterDemo: () => {
        const { settings, profile, plans, logs, water, weights, chat, grocery } = get();
        if (!settings.demoMode) {
          safeStorage.setItem(DEMO_BACKUP_KEY, JSON.stringify({ settings, profile, plans, logs, water, weights, chat, grocery }));
        }
        set({ ...initialData, ...buildDemoSeed(calcTargets), settings: { ...settings, demoMode: true }, undoStack: [] });
      },
      exitDemo: () => {
        let backup = null;
        try {
          backup = JSON.parse(safeStorage.getItem(DEMO_BACKUP_KEY));
        } catch {
          /* no backup */
        }
        safeStorage.removeItem(DEMO_BACKUP_KEY);
        // Keep current settings (e.g. a key saved during the demo); restore the data.
        const { settings: _old, ...data } = backup || {};
        set({ ...initialData, ...data, settings: { ...get().settings, demoMode: false }, undoStack: [] });
      },
      resetData: () => set({ ...initialData, settings: get().settings, undoStack: [] }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ undoStack: _u, ...rest }) =>
        Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')),
    }
  )
);
