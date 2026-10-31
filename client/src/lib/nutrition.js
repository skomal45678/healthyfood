// Deterministic nutrition math. The AI suggests foods; all targets and totals
// are computed here so numbers are always consistent.

export const ACTIVITY = {
  sedentary: { label: 'Sedentary (desk job, little exercise)', factor: 1.2 },
  light: { label: 'Light (exercise 1-3 days/week)', factor: 1.375 },
  moderate: { label: 'Moderate (exercise 3-5 days/week)', factor: 1.55 },
  active: { label: 'Active (exercise 6-7 days/week)', factor: 1.725 },
  very_active: { label: 'Very active (physical job + training)', factor: 1.9 },
};

export const GOALS = {
  lose: { label: 'Lose fat', proteinPerKg: 1.8 },
  maintain: { label: 'Maintain weight', proteinPerKg: 1.4 },
  gain: { label: 'Gain weight', proteinPerKg: 1.6 },
  muscle: { label: 'Build muscle', proteinPerKg: 2.0 },
};

// kcal per day relative to TDEE
const PACE = {
  lose: { slow: -250, normal: -500, fast: -750 },
  gain: { slow: 250, normal: 400, fast: 550 },
  muscle: { slow: 200, normal: 300, fast: 400 },
  maintain: { slow: 0, normal: 0, fast: 0 },
};

export const DIET_TYPES = {
  vegetarian: 'Vegetarian (no meat, fish or eggs)',
  eggetarian: 'Eggetarian (vegetarian + eggs)',
  vegan: 'Vegan (no animal products)',
  non_vegetarian: 'Non-vegetarian',
  pescatarian: 'Pescatarian (vegetarian + fish)',
  keto: 'Keto (very low carb)',
  jain: 'Jain (no root vegetables, onion, garlic)',
};

const round = (n, step = 1) => Math.round((Number(n) || 0) / step) * step;
export const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

export function bmr({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base - 78; // midpoint for "other / prefer not to say"
}

export function calcTargets(profile) {
  const p = profile || {};
  if (!p.weightKg || !p.heightCm || !p.age) return null;
  const b = bmr(p);
  const tdee = b * (ACTIVITY[p.activity]?.factor ?? 1.375);
  const goal = GOALS[p.goal] ? p.goal : 'maintain';
  const floor = p.sex === 'male' ? 1500 : 1200;
  const kcal = Math.max(floor, round(tdee + (PACE[goal][p.pace] ?? PACE[goal].normal), 10));

  const protein = round(p.weightKg * GOALS[goal].proteinPerKg);
  let fat, carbs;
  if (p.dietType === 'keto') {
    carbs = 25;
    fat = round((kcal - protein * 4 - carbs * 4) / 9);
  } else {
    fat = round((kcal * 0.27) / 9);
    carbs = Math.max(0, round((kcal - protein * 4 - fat * 9) / 4));
  }
  return {
    bmr: round(b),
    tdee: round(tdee),
    kcal,
    protein,
    carbs,
    fat,
    fiber: round((kcal / 1000) * 14),
    waterMl: round(p.weightKg * 35, 250),
  };
}

export function bmi({ weightKg, heightCm }) {
  if (!weightKg || !heightCm) return null;
  const v = weightKg / (heightCm / 100) ** 2;
  const label = v < 18.5 ? 'Underweight' : v < 25 ? 'Healthy' : v < 30 ? 'Overweight' : 'Obese';
  return { value: r1(v), label };
}

export const ZERO = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export function sumItems(items = []) {
  return items.reduce(
    (t, i) => ({
      kcal: t.kcal + (Number(i.kcal) || 0),
      protein: t.protein + (Number(i.protein) || 0),
      carbs: t.carbs + (Number(i.carbs) || 0),
      fat: t.fat + (Number(i.fat) || 0),
      fiber: t.fiber + (Number(i.fiber) || 0),
    }),
    { ...ZERO }
  );
}

export const sumMeals = (meals = []) => sumItems(meals.flatMap((m) => m.items || []));
export const sumLogs = (logs = []) => sumItems(logs.flatMap((l) => l.items || []));

// Change an item's quantity; nutrition scales linearly.
export function scaleItem(item, newQty) {
  const qty = Math.max(0, Number(newQty) || 0);
  const ratio = item.qty > 0 ? qty / item.qty : 0;
  const s = (v) => r1((Number(v) || 0) * ratio);
  return {
    ...item,
    qty: r1(qty),
    grams: s(item.grams),
    kcal: Math.round((Number(item.kcal) || 0) * ratio),
    protein: s(item.protein),
    carbs: s(item.carbs),
    fat: s(item.fat),
    fiber: s(item.fiber),
  };
}

// Offline fallback for "adjust my day": scale remaining meals proportionally.
export function fallbackAdjust(remainingMeals, targets, consumed) {
  const planned = sumMeals(remainingMeals).kcal;
  const left = Math.max(0, targets.kcal - consumed.kcal);
  if (!planned) return remainingMeals;
  const factor = Math.min(1.8, Math.max(0.3, left / planned));
  return remainingMeals.map((m) => ({
    ...m,
    items: m.items.map((i) => scaleItem(i, i.qty * factor)),
  }));
}

// Percent difference of total vs target, e.g. 0.12 = 12% over.
export function deviation(total, target) {
  if (!target) return 0;
  return (total - target) / target;
}

const ALLERGEN_WORDS = {
  milk: ['milk', 'dairy', 'paneer', 'cheese', 'curd', 'yogurt', 'yoghurt', 'ghee', 'butter', 'cream', 'whey', 'lassi', 'khoa', 'raita'],
  dairy: ['milk', 'dairy', 'paneer', 'cheese', 'curd', 'yogurt', 'yoghurt', 'ghee', 'butter', 'cream', 'whey', 'lassi', 'khoa', 'raita'],
  lactose: ['milk', 'paneer', 'cheese', 'curd', 'yogurt', 'cream', 'whey', 'lassi', 'khoa'],
  egg: ['egg', 'omelette', 'omelet', 'mayonnaise', 'mayo', 'bhurji'],
  peanut: ['peanut', 'groundnut', 'moongphali'],
  nut: ['almond', 'cashew', 'walnut', 'pistachio', 'hazelnut', 'pecan', 'nut'],
  gluten: ['wheat', 'roti', 'chapati', 'bread', 'pasta', 'naan', 'paratha', 'barley', 'rye', 'semolina', 'suji', 'rava', 'maida', 'oats', 'seitan', 'noodle', 'couscous'],
  soy: ['soy', 'soya', 'tofu', 'edamame', 'tempeh'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'sardine', 'mackerel', 'anchovy'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'oyster', 'mussel', 'clam'],
  sesame: ['sesame', 'til', 'tahini'],
};

// Return the user's allergens that appear in any item name.
export function findAllergens(items = [], allergies = []) {
  const hits = new Set();
  for (const allergy of allergies) {
    const a = allergy.toLowerCase().trim();
    if (!a) continue;
    const words = ALLERGEN_WORDS[a] || ALLERGEN_WORDS[a.replace(/s$/, '')] || [a];
    for (const item of items) {
      const name = String(item.name || '').toLowerCase();
      if (words.some((w) => name.includes(w))) hits.add(`${allergy} (${item.name})`);
    }
  }
  return [...hits];
}
