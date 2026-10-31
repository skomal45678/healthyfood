// Offline demo mode: realistic, locally generated answers for every AI
// endpoint so the app can be presented with no internet and no API key.
import { fallbackAdjust, findAllergens, scaleItem, sumItems, sumMeals, r1 } from './nutrition';
import { addDays, dateKey, uid } from './utils';

export const DEMO_MODEL = 'offline-demo';

const wait = (ms = 700 + Math.random() * 700) => new Promise((r) => setTimeout(r, ms));

const it = (name, qty, unit, grams, kcal, protein, carbs, fat, fiber = 0) => ({ name, qty, unit, grams, kcal, protein, carbs, fat, fiber });

// ---- Small offline food database (values per listed unit) ------------------
const FOODS = [
  { k: ['roti', 'chapati', 'phulka'], i: it('Whole wheat roti', 1, 'piece', 40, 120, 4, 22, 2, 3) },
  { k: ['paratha'], i: it('Plain paratha', 1, 'piece', 60, 200, 4, 28, 8, 3) },
  { k: ['rice', 'chawal'], i: it('Steamed rice', 1, 'cup', 160, 205, 4.2, 45, 0.4, 0.6) },
  { k: ['dal', 'daal', 'lentil'], i: it('Dal tadka', 1, 'bowl', 200, 220, 12, 30, 6, 7) },
  { k: ['rajma'], i: it('Rajma curry', 1, 'bowl', 200, 240, 13, 34, 6, 10) },
  { k: ['chole', 'chana', 'chickpea'], i: it('Chole', 1, 'bowl', 200, 260, 12, 36, 8, 10) },
  { k: ['paneer'], i: it('Paneer curry', 1, 'bowl', 150, 300, 16, 10, 22, 2) },
  { k: ['tofu'], i: it('Tofu stir-fry', 1, 'bowl', 150, 180, 16, 8, 10, 3) },
  { k: ['egg', 'omelette', 'omelet'], i: it('Boiled egg', 1, 'piece', 50, 78, 6.5, 0.6, 5.3, 0) },
  { k: ['chicken'], i: it('Chicken curry', 1, 'bowl', 200, 320, 30, 8, 18, 2) },
  { k: ['fish'], i: it('Fish curry', 1, 'bowl', 200, 260, 26, 6, 14, 1) },
  { k: ['milk'], i: it('Milk (toned)', 1, 'glass', 250, 145, 8, 12, 7.5, 0) },
  { k: ['curd', 'dahi', 'yogurt', 'yoghurt'], i: it('Curd', 1, 'bowl', 150, 90, 5, 7, 4.5, 0) },
  { k: ['buttermilk', 'chaas'], i: it('Buttermilk', 1, 'glass', 250, 40, 2, 5, 1, 0) },
  { k: ['lassi'], i: it('Sweet lassi', 1, 'glass', 250, 220, 7, 34, 6, 0) },
  { k: ['tea', 'chai'], i: it('Masala chai with sugar', 1, 'cup', 150, 90, 3, 14, 3, 0) },
  { k: ['coffee'], i: it('Coffee with milk & sugar', 1, 'cup', 150, 80, 3, 12, 2.5, 0) },
  { k: ['oats', 'oatmeal', 'porridge'], i: it('Oats porridge with milk', 1, 'bowl', 250, 300, 12, 45, 7, 6) },
  { k: ['poha'], i: it('Poha', 1, 'plate', 180, 250, 5, 42, 7, 3) },
  { k: ['upma'], i: it('Upma', 1, 'plate', 200, 250, 6, 38, 8, 3) },
  { k: ['idli'], i: it('Idli', 1, 'piece', 40, 58, 2, 12, 0.2, 0.6) },
  { k: ['dosa'], i: it('Plain dosa', 1, 'piece', 100, 170, 4, 28, 4.5, 1.5) },
  { k: ['sambar'], i: it('Sambar', 1, 'bowl', 200, 140, 6, 20, 4, 5) },
  { k: ['chutney'], i: it('Coconut chutney', 2, 'tbsp', 30, 70, 1, 3, 6, 1.5) },
  { k: ['bread', 'toast'], i: it('Brown bread', 1, 'slice', 30, 75, 3, 13, 1, 2) },
  { k: ['banana'], i: it('Banana', 1, 'medium', 118, 105, 1.3, 27, 0.4, 3.1) },
  { k: ['apple'], i: it('Apple', 1, 'medium', 180, 95, 0.5, 25, 0.3, 4.4) },
  { k: ['salad'], i: it('Green salad', 1, 'bowl', 150, 45, 2, 8, 0.5, 3) },
  { k: ['sprouts'], i: it('Moong sprouts salad', 1, 'bowl', 120, 120, 9, 18, 1, 5) },
  { k: ['peanut', 'groundnut'], i: it('Roasted peanuts', 1, 'handful', 30, 170, 7.5, 5, 14, 2.5) },
  { k: ['almond', 'nuts'], i: it('Almonds', 10, 'piece', 14, 82, 3, 3, 7, 1.7) },
  { k: ['samosa'], i: it('Samosa', 1, 'piece', 100, 260, 4, 30, 14, 2) },
  { k: ['biryani'], i: it('Veg biryani', 1, 'plate', 300, 450, 10, 70, 14, 5) },
  { k: ['pizza'], i: it('Pizza', 1, 'slice', 110, 285, 12, 36, 10, 2.5) },
  { k: ['burger'], i: it('Veg burger', 1, 'piece', 180, 400, 12, 50, 17, 4) },
  { k: ['sabzi', 'sabji', 'vegetable', 'veg'], i: it('Mixed vegetable sabzi', 1, 'bowl', 150, 130, 3.5, 14, 7, 5) },
  { k: ['soya', 'soy chunks'], i: it('Soya chunks curry', 1, 'bowl', 150, 200, 20, 14, 7, 5) },
  { k: ['whey', 'protein shake'], i: it('Whey protein shake', 1, 'scoop', 30, 120, 24, 3, 1.5, 0) },
];

const NUM_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, half: 0.5 };

export function parseFoodOffline(text) {
  const parts = String(text)
    .toLowerCase()
    .split(/,|\band\b|\bwith\b|\+|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((part) => {
    const numMatch = part.match(/(\d+(?:\.\d+)?)/);
    const wordMatch = part.match(/\b(a|an|one|two|three|four|five|half)\b/);
    const qtyFactor = numMatch ? parseFloat(numMatch[1]) : wordMatch ? NUM_WORDS[wordMatch[1]] : 1;
    // Longest keyword wins, so "buttermilk" is not read as "milk".
    let food = null;
    let best = 0;
    for (const f of FOODS) {
      for (const k of f.k) {
        if (k.length > best && part.includes(k)) {
          food = f;
          best = k.length;
        }
      }
    }
    if (!food) {
      const name = part.replace(/^(\d+(\.\d+)?|a|an|one|two|three|half)\s+/, '').replace(/^\w/, (c) => c.toUpperCase());
      return { ...it(name || 'Food', 1, 'serving', 150, 180, 6, 22, 7, 2), id: uid() };
    }
    return { ...scaleItem(food.i, food.i.qty * qtyFactor), id: uid() };
  });
}

// ---- Canned day plans (scaled to the user's calorie target) ----------------
const PLANS = [
  {
    meals: [
      { name: 'Breakfast', time: '08:00', notes: 'Cook oats in milk, top with banana slices.', items: [it('Oats porridge with milk', 1, 'bowl', 250, 300, 12, 45, 7, 6), it('Banana', 1, 'medium', 118, 105, 1.3, 27, 0.4, 3.1), it('Boiled egg', 2, 'piece', 100, 155, 13, 1.1, 11, 0)] },
      { name: 'Lunch', time: '13:00', notes: 'Fill half the plate with salad first.', items: [it('Whole wheat roti', 2, 'piece', 80, 240, 8, 44, 4, 6), it('Dal tadka', 1, 'bowl', 200, 220, 12, 30, 6, 7), it('Mixed vegetable sabzi', 1, 'bowl', 150, 130, 3.5, 14, 7, 5), it('Green salad', 1, 'bowl', 150, 45, 2, 8, 0.5, 3)] },
      { name: 'Snack', time: '17:00', notes: 'Squeeze lemon on the sprouts.', items: [it('Moong sprouts salad', 1, 'bowl', 120, 120, 9, 18, 1, 5), it('Buttermilk', 1, 'glass', 250, 40, 2, 5, 1, 0)] },
      { name: 'Dinner', time: '20:00', notes: 'Use 1 tsp oil for the bhurji.', items: [it('Paneer bhurji', 1, 'bowl', 150, 280, 18, 8, 20, 1), it('Whole wheat roti', 1, 'piece', 40, 120, 4, 22, 2, 3), it('Cucumber raita', 1, 'bowl', 150, 80, 5, 7, 3.5, 1)] },
    ],
    tips: ['Drink a glass of water before each meal.', 'Prep sprouts the night before to save time.'],
  },
  {
    meals: [
      { name: 'Breakfast', time: '08:00', notes: 'Add peas and peanuts-free tempering.', items: [it('Vegetable poha', 1, 'plate', 180, 250, 5, 42, 7, 3), it('Curd', 1, 'bowl', 150, 90, 5, 7, 4.5, 0), it('Boiled egg', 1, 'piece', 50, 78, 6.5, 0.6, 5.3, 0)] },
      { name: 'Lunch', time: '13:00', notes: 'Pressure-cook rajma with tomatoes and onion.', items: [it('Rajma curry', 1, 'bowl', 200, 240, 13, 34, 6, 10), it('Steamed rice', 1, 'cup', 160, 205, 4.2, 45, 0.4, 0.6), it('Green salad', 1, 'bowl', 150, 45, 2, 8, 0.5, 3)] },
      { name: 'Snack', time: '17:00', notes: '', items: [it('Apple', 1, 'medium', 180, 95, 0.5, 25, 0.3, 4.4), it('Almonds', 10, 'piece', 14, 82, 3, 3, 7, 1.7)] },
      { name: 'Dinner', time: '20:00', notes: 'Light dinner, finish 2 hours before bed.', items: [it('Soya chunks curry', 1, 'bowl', 150, 200, 20, 14, 7, 5), it('Millet roti', 2, 'piece', 80, 220, 6, 42, 3, 6), it('Mixed vegetable sabzi', 1, 'bowl', 150, 130, 3.5, 14, 7, 5)] },
    ],
    tips: ['Soya chunks are a cheap, high-protein vegetarian option.', 'Pair iron-rich rajma with lemon for better absorption.'],
  },
  {
    meals: [
      { name: 'Breakfast', time: '08:00', notes: '', items: [it('Idli', 3, 'piece', 120, 174, 6, 36, 0.6, 1.8), it('Sambar', 1, 'bowl', 200, 140, 6, 20, 4, 5), it('Coconut chutney', 2, 'tbsp', 30, 70, 1, 3, 6, 1.5)] },
      { name: 'Lunch', time: '13:00', notes: 'Add extra vegetables to the chole.', items: [it('Chole', 1, 'bowl', 200, 260, 12, 36, 8, 10), it('Whole wheat roti', 2, 'piece', 80, 240, 8, 44, 4, 6), it('Curd', 1, 'bowl', 150, 90, 5, 7, 4.5, 0)] },
      { name: 'Snack', time: '17:00', notes: '', items: [it('Roasted makhana', 1, 'cup', 30, 110, 3, 20, 1.5, 2), it('Masala chai (less sugar)', 1, 'cup', 150, 70, 3, 9, 3, 0)] },
      { name: 'Dinner', time: '20:00', notes: 'Grill the tofu with ginger, garlic and soy sauce.', items: [it('Tofu stir-fry', 1, 'bowl', 150, 180, 16, 8, 10, 3), it('Brown rice', 1, 'cup', 160, 215, 5, 45, 1.8, 3.5), it('Clear vegetable soup', 1, 'bowl', 250, 60, 2, 10, 1, 3)] },
    ],
    tips: ['Fermented foods like idli and curd support gut health.'],
  },
];

let planCursor = 0;

function fitPlan(plan, profile, targets) {
  const banned = [...(profile?.allergies || []), ...(profile?.dislikes || [])];
  let meals = plan.meals
    .map((m) => ({ ...m, items: m.items.filter((i) => !findAllergens([i], banned).length) }))
    .filter((m) => m.items.length);
  const n = Number(profile?.mealsPerDay) || 4;
  if (n === 3) meals = meals.filter((m) => m.name !== 'Snack');
  const total = sumMeals(meals).kcal;
  const factor = targets?.kcal && total ? targets.kcal / total : 1;
  return meals.map((m) => ({ ...m, items: m.items.map((i) => scaleItem(i, r1(i.qty * factor) || i.qty)) }));
}

// ---- Swaps ---------------------------------------------------------------
const SWAPS = [
  { k: ['milk'], to: it('Soy milk (unsweetened)', 1, 'glass', 250, 100, 8, 4, 4.5, 1), why: 'Dairy-free with almost the same protein.' },
  { k: ['egg'], to: it('Paneer cubes', 50, 'g', 50, 132, 9, 2, 10, 0), why: 'Vegetarian protein with a similar calorie count.' },
  { k: ['paneer'], to: it('Tofu', 150, 'g', 150, 180, 16, 4, 11, 2), why: 'Plant-based, lower fat and similar protein.' },
  { k: ['rice'], to: it('Quinoa', 1, 'cup', 185, 222, 8, 39, 3.6, 5), why: 'More protein and fibre than white rice.' },
  { k: ['roti', 'chapati', 'bread'], to: it('Jowar roti', 1, 'piece', 40, 110, 3.5, 22, 1, 3), why: 'Gluten-free millet with more fibre.' },
  { k: ['oats'], to: it('Vegetable daliya', 1, 'bowl', 200, 220, 7, 40, 3, 6), why: 'Whole-grain alternative with lots of fibre.' },
  { k: ['peanut', 'almond', 'nut'], to: it('Roasted chana', 1, 'handful', 30, 110, 6, 18, 2, 5), why: 'Nut-free, crunchy and protein-rich.' },
  { k: ['curd', 'yogurt', 'raita'], to: it('Coconut yogurt', 1, 'bowl', 150, 120, 1.5, 9, 9, 1), why: 'Dairy-free, probiotic alternative.' },
  { k: ['chicken', 'fish'], to: it('Soya chunks curry', 1, 'bowl', 150, 200, 20, 14, 7, 5), why: 'Vegetarian swap with comparable protein.' },
];

function swapOffline({ item, instruction }) {
  const name = item.name.toLowerCase();
  const rule = SWAPS.find((s) => s.k.some((k) => name.includes(k))) || {
    to: it('Moong sprouts salad', 1, 'bowl', 120, 120, 9, 18, 1, 5),
    why: 'A fresh, high-fibre, high-protein option.',
  };
  const factor = rule.to.kcal ? (item.kcal || rule.to.kcal) / rule.to.kcal : 1;
  const swapped = scaleItem(rule.to, r1(rule.to.qty * factor) || rule.to.qty);
  return { item: swapped, reason: instruction ? `${rule.why} (${instruction})` : rule.why };
}

// ---- Photo analysis --------------------------------------------------------
const PHOTOS = [
  {
    dish: 'Dal rice with salad',
    healthScore: 8,
    notes: 'Balanced plate. Add a protein side such as curd to boost protein.',
    items: [
      { ...it('Steamed rice', 1, 'cup', 160, 205, 4.2, 45, 0.4, 0.6), confidence: 0.86 },
      { ...it('Dal tadka', 1, 'bowl', 180, 200, 11, 27, 5.5, 6), confidence: 0.78 },
      { ...it('Cucumber & tomato salad', 1, 'small bowl', 100, 30, 1, 6, 0.2, 2), confidence: 0.9 },
    ],
  },
  {
    dish: 'Masala dosa with sambar',
    healthScore: 6,
    notes: 'The potato filling and ghee add calories. Sambar adds fibre and protein.',
    items: [
      { ...it('Masala dosa', 1, 'piece', 180, 390, 7, 52, 17, 4), confidence: 0.82 },
      { ...it('Sambar', 1, 'bowl', 200, 140, 6, 20, 4, 5), confidence: 0.74 },
      { ...it('Coconut chutney', 2, 'tbsp', 30, 70, 1, 3, 6, 1.5), confidence: 0.65 },
    ],
  },
  {
    dish: 'Paneer tikka with mint chutney',
    healthScore: 7,
    notes: 'High protein. Grilled rather than fried, which keeps the fat moderate.',
    items: [
      { ...it('Paneer tikka', 6, 'piece', 150, 330, 20, 9, 24, 1.5), confidence: 0.8 },
      { ...it('Grilled onion & capsicum', 1, 'serving', 80, 35, 1, 7, 0.3, 2), confidence: 0.7 },
      { ...it('Mint chutney', 2, 'tbsp', 30, 20, 1, 3, 0.3, 1), confidence: 0.6 },
    ],
  },
];
let photoCursor = 0;

// ---- Coach -----------------------------------------------------------------
function coachOffline(messages, context) {
  const q = messages.at(-1)?.content.toLowerCase() || '';
  const t = context?.dailyTargets;
  const eaten = context?.eatenToday;
  const leftKcal = t && eaten ? Math.max(0, Math.round(t.kcal - eaten.kcal)) : null;
  const leftProtein = t && eaten ? Math.max(0, Math.round(t.protein - eaten.protein)) : null;

  if (/protein/.test(q))
    return `You have about **${leftProtein ?? 40} g protein** left today. Easy vegetarian ways to close the gap:
- 150 g paneer or tofu: ~20 g
- 1 bowl soya chunks curry: ~20 g
- 1 cup curd + 1 scoop whey: ~30 g
- 1 bowl moong sprouts: ~9 g
Spread protein across meals (20–30 g each) for better absorption.`;
  if (/snack/.test(q))
    return `Here are 5 high-protein snacks under 200 kcal:
- **Roasted chana** (30 g): 110 kcal, 6 g protein
- **Moong sprouts chaat**: 120 kcal, 9 g protein
- **Greek yogurt / hung curd** (150 g): 130 kcal, 15 g protein
- **2 boiled eggs**: 155 kcal, 13 g protein
- **Paneer tikka** (4 pieces): 180 kcal, 12 g protein`;
  if (/sugar|craving|sweet/.test(q))
    return `Evening sugar cravings usually come from under-eating earlier in the day or low protein. Try:
- Eat a protein-rich lunch (dal + curd, or paneer)
- Have a planned snack at 5 pm: fruit + a handful of nuts
- Drink water or herbal tea first: thirst often feels like hunger
- If you want something sweet, have 2 dates or a small piece of dark chocolate
- Sleep 7–8 hours: poor sleep increases cravings`;
  if (/dinner/.test(q))
    return `With about **${leftKcal ?? 500} kcal** left, a good dinner would be:
- 1 bowl dal or soya chunks curry
- 1–2 millet rotis
- A big bowl of sautéed vegetables or salad
Keep it light and finish eating 2–3 hours before bed.`;
  if (/balanced|plan|change/.test(q))
    return `Your plan looks well balanced. A few suggestions:
- Protein is the hardest target: keep a high-protein snack (curd, sprouts, paneer)
- Aim for 25–30 g fibre: add salad to lunch and dinner
- Keep added oil to 3–4 tsp a day
- Use **Adjust my day** after any unplanned meal so the rest of the day stays on track.`;
  if (/water|hydrat/.test(q))
    return `Aim for about ${t ? (t.waterMl / 1000).toFixed(1) : '2.5'} L of water a day. Start with a glass after waking, keep a bottle at your desk, and drink a glass before each meal.`;
  return `Good question! Some general guidance for your goal:
- Hit your protein target first, then fill up on vegetables
- You have about **${leftKcal ?? 'some'} kcal** left today
- Prefer whole grains (millets, brown rice, whole wheat) over refined ones
- Stay consistent: small daily habits beat perfect days
*(Offline demo answer. Connect an API key for full AI coaching.)*`;
}

// ---- Grocery & recipe --------------------------------------------------------
const CATEGORY_RULES = [
  ['Produce', ['salad', 'banana', 'apple', 'vegetable', 'sabzi', 'cucumber', 'tomato', 'onion', 'capsicum', 'sprouts', 'soup', 'mint']],
  ['Dairy & Eggs', ['milk', 'curd', 'paneer', 'egg', 'raita', 'yogurt', 'buttermilk', 'lassi']],
  ['Grains & Bread', ['roti', 'rice', 'oats', 'poha', 'idli', 'dosa', 'bread', 'millet', 'quinoa', 'daliya', 'jowar', 'upma']],
  ['Protein & Pulses', ['dal', 'rajma', 'chole', 'chana', 'soya', 'tofu', 'moong', 'chicken', 'fish']],
  ['Nuts & Snacks', ['almond', 'peanut', 'makhana', 'nut']],
];

function groceryOffline(meals, days) {
  const counts = {};
  for (const i of meals.flatMap((m) => m.items)) {
    const key = i.name;
    counts[key] = counts[key] || { qty: 0, unit: i.unit, grams: 0 };
    counts[key].qty += Number(i.qty) || 0;
    counts[key].grams += Number(i.grams) || 0;
  }
  const cats = {};
  for (const [name, c] of Object.entries(counts)) {
    const lower = name.toLowerCase();
    const cat = CATEGORY_RULES.find(([, kws]) => kws.some((k) => lower.includes(k)))?.[0] || 'Other';
    const quantity = c.grams >= 1000 ? `${r1(c.grams / 1000)} kg` : c.grams ? `${Math.round(c.grams)} g` : `${r1(c.qty)} ${c.unit}`;
    (cats[cat] = cats[cat] || []).push({ name, quantity });
  }
  return { categories: Object.entries(cats).map(([name, items]) => ({ name, items })), days };
}

function recipeOffline(meal) {
  const names = meal.items.map((i) => i.name);
  return {
    title: meal.name,
    prepMinutes: 20,
    servings: 1,
    ingredients: meal.items.map((i) => `${r1(i.qty)} ${i.unit} ${i.name}${i.grams ? ` (~${Math.round(i.grams)} g)` : ''}`),
    steps: [
      'Wash and chop all vegetables; rinse any pulses or grains.',
      ...names.map((n) => `Prepare the ${n.toLowerCase()}: cook with minimal oil (1 tsp) and season with salt, turmeric and your favourite spices.`),
      'Plate everything together, adding salad or raw vegetables first.',
    ],
    tips: ['Measure oil with a spoon instead of pouring.', 'Cook a double batch and refrigerate one portion for tomorrow.'],
  };
}

// ---- Router: same interface as the real API -----------------------------------
export async function demoRequest(path, body = {}) {
  await wait(path === '/models' || path === '/health' ? 50 : undefined);
  const m = { model: DEMO_MODEL };
  switch (path) {
    case '/health':
      return { ok: true, demo: true };
    case '/models':
      return {
        text: [{ id: DEMO_MODEL, name: 'Offline demo (no internet)', context: null }],
        vision: [{ id: DEMO_MODEL, name: 'Offline demo (no internet)', context: null }],
        defaults: { text: DEMO_MODEL, vision: DEMO_MODEL },
      };
    case '/validate-key':
      return { ok: true, label: 'Offline demo', isFreeTier: true };
    case '/plan/generate': {
      const plan = PLANS[planCursor++ % PLANS.length];
      return { meals: fitPlan(plan, body.profile, body.targets), tips: plan.tips, ...m };
    }
    case '/plan/swap':
      return { ...swapOffline(body), ...m };
    case '/plan/regenerate-meal': {
      const others = PLANS.flatMap((p) => p.meals).filter(
        (x) => x.name === body.meal.name && x.items[0].name !== body.meal.items[0]?.name
      );
      const pick = others[Math.floor(Math.random() * others.length)] || body.meal;
      const target = body.targets?.kcal || sumItems(body.meal.items).kcal;
      const factor = target / (sumItems(pick.items).kcal || target);
      return {
        meal: { ...pick, name: body.meal.name, items: pick.items.map((i) => scaleItem(i, r1(i.qty * factor) || i.qty)) },
        ...m,
      };
    }
    case '/analyze-image':
      // The bundled sample plate is always dal rice; other photos rotate.
      return { isFood: true, ...(body.sample ? PHOTOS[0] : PHOTOS[photoCursor++ % PHOTOS.length]), ...m };
    case '/parse-food':
      return { items: parseFoodOffline(body.text), ...m };
    case '/adjust-day': {
      const meals = fallbackAdjust(body.remainingMeals, body.targets, { kcal: 0, ...body.consumed });
      const left = Math.max(0, body.targets.kcal - (body.consumed.kcal || 0));
      return {
        meals,
        explanation: `You have ${Math.round(left)} kcal left, so the portions of your remaining meals were rescaled to land on your daily target.`,
        ...m,
      };
    }
    case '/coach':
      return { reply: coachOffline(body.messages, body.context), ...m };
    case '/grocery-list':
      return { ...groceryOffline(body.meals, body.days), ...m };
    case '/recipe':
      return { ...recipeOffline(body.meal), ...m };
    default:
      throw new Error(`Demo mode has no answer for ${path}`);
  }
}

// ---- Sample data loaded when the demo starts ------------------------------------
export function buildDemoSeed(calcTargets) {
  const today = dateKey();
  const profile = {
    name: 'Asha',
    age: 26,
    sex: 'female',
    heightCm: 162,
    weightKg: 66,
    targetWeightKg: 60,
    activity: 'light',
    goal: 'lose',
    pace: 'normal',
    dietType: 'eggetarian',
    cuisine: 'Indian',
    allergies: ['peanut'],
    dislikes: [],
    mealsPerDay: 4,
    budget: 'moderate',
    notes: '',
    updatedAt: Date.now(),
  };
  const targets = calcTargets(profile);
  const withIds = (meals) => meals.map((mm) => ({ ...mm, id: uid(), items: mm.items.map((i) => ({ ...i, id: uid() })) }));
  const plan = { meals: withIds(fitPlan(PLANS[0], profile, targets)), tips: PLANS[0].tips, model: DEMO_MODEL, generatedAt: Date.now() };

  // Two weeks of history for charts and streaks.
  const logs = {};
  const water = {};
  const weights = [];
  for (let d = 13; d >= 1; d--) {
    const date = addDays(today, -d);
    const p = PLANS[d % PLANS.length];
    const wobble = 0.85 + ((d * 37) % 30) / 100; // deterministic 0.85–1.14
    logs[date] = fitPlan(p, profile, { kcal: targets.kcal * wobble }).map((meal) => ({
      id: uid(),
      mealName: meal.name,
      source: 'text',
      items: meal.items.map((i) => ({ ...i, id: uid() })),
      at: Date.now() - d * 86400000,
    }));
    water[date] = 1500 + ((d * 250) % 1250);
    if (d % 2 === 1) weights.push({ date, kg: r1(66 + d * 0.12 - ((d * 7) % 3) * 0.1) });
  }
  weights.push({ date: today, kg: 66 });

  // Today: breakfast eaten from the plan.
  const breakfast = plan.meals[0];
  logs[today] = [{ id: uid(), mealName: breakfast.name, source: 'plan', planMealId: breakfast.id, items: breakfast.items, at: Date.now() }];
  water[today] = 750;

  return {
    profile,
    plans: { [today]: plan },
    logs,
    water,
    weights,
    chat: [
      { role: 'user', content: 'How can I reduce sugar cravings in the evening?' },
      { role: 'assistant', content: coachOffline([{ content: 'sugar' }], {}) },
    ],
    grocery: null,
  };
}
