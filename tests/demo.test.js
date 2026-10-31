import { describe, it, expect } from 'vitest';
import { demoRequest, parseFoodOffline, buildDemoSeed } from '../client/src/lib/demo.js';
import { calcTargets, sumMeals, findAllergens } from '../client/src/lib/nutrition.js';

const profile = { age: 26, sex: 'female', heightCm: 162, weightKg: 66, activity: 'light', goal: 'lose', dietType: 'eggetarian', allergies: ['milk'], dislikes: [], mealsPerDay: 4 };
const targets = calcTargets(profile);

describe('offline demo engine', () => {
  it('parses free text with quantities from the offline food database', () => {
    const items = parseFoodOffline('2 roti, dal and a glass of buttermilk');
    expect(items.map((i) => i.name)).toEqual(['Whole wheat roti', 'Dal tadka', 'Buttermilk']);
    expect(items[0].kcal).toBe(240);
  });

  it('falls back to a generic item for unknown foods', () => {
    const [item] = parseFoodOffline('1 mystery stew');
    expect(item.name).toBe('Mystery stew');
    expect(item.kcal).toBeGreaterThan(0);
  });

  it('generates plans near the calorie target without allergens', async () => {
    for (let n = 0; n < 3; n++) {
      const plan = await demoRequest('/plan/generate', { profile, targets });
      const kcal = sumMeals(plan.meals).kcal;
      expect(Math.abs(kcal - targets.kcal) / targets.kcal).toBeLessThan(0.1);
      expect(findAllergens(plan.meals.flatMap((m) => m.items), profile.allergies)).toEqual([]);
    }
  }, 15000);

  it('answers every endpoint the app uses', async () => {
    const meal = { name: 'Dinner', items: [{ name: 'Paneer bhurji', qty: 1, unit: 'bowl', grams: 150, kcal: 280, protein: 18, carbs: 8, fat: 20, fiber: 1 }] };
    const swap = await demoRequest('/plan/swap', { item: { ...meal.items[0], name: 'Milk', kcal: 145 }, profile });
    expect(swap.item.name).toMatch(/soy/i);
    expect((await demoRequest('/plan/regenerate-meal', { meal, profile, targets: { kcal: 500 } })).meal.name).toBe('Dinner');
    expect((await demoRequest('/analyze-image', { image: 'data:image/png;base64,' })).items.length).toBeGreaterThan(0);
    const adj = await demoRequest('/adjust-day', { profile, targets, consumed: { kcal: targets.kcal - 300 }, remainingMeals: [meal] });
    expect(Math.abs(sumMeals(adj.meals).kcal - 300)).toBeLessThan(15);
    expect((await demoRequest('/coach', { messages: [{ role: 'user', content: 'protein ideas?' }] })).reply).toMatch(/protein/i);
    expect((await demoRequest('/grocery-list', { meals: [meal], days: 1 })).categories[0].name).toBe('Dairy & Eggs');
    expect((await demoRequest('/recipe', { meal })).steps.length).toBeGreaterThan(1);
    expect((await demoRequest('/validate-key', {})).ok).toBe(true);
  }, 20000);

  it('builds sample data with history for charts', () => {
    const seed = buildDemoSeed(calcTargets);
    expect(Object.keys(seed.logs).length).toBe(14);
    expect(seed.weights.length).toBeGreaterThan(3);
    expect(Object.values(seed.plans)[0].meals.length).toBe(4);
  });
});
