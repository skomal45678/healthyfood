import { describe, it, expect } from 'vitest';
import { bmr, calcTargets, scaleItem, sumItems, fallbackAdjust, findAllergens, deviation } from '../client/src/lib/nutrition.js';
import { dayState } from '../client/src/lib/day.js';
import { addDays } from '../client/src/lib/utils.js';

const profile = { age: 25, sex: 'male', heightCm: 175, weightKg: 70, activity: 'moderate', goal: 'lose', pace: 'normal', dietType: 'vegetarian' };

describe('targets', () => {
  it('uses Mifflin-St Jeor for BMR', () => {
    expect(bmr(profile)).toBeCloseTo(10 * 70 + 6.25 * 175 - 5 * 25 + 5);
    expect(bmr({ ...profile, sex: 'female' })).toBeCloseTo(10 * 70 + 6.25 * 175 - 5 * 25 - 161);
  });

  it('applies a 500 kcal deficit for normal fat loss and macros add up', () => {
    const t = calcTargets(profile);
    expect(t.kcal).toBe(Math.round((bmr(profile) * 1.55 - 500) / 10) * 10);
    expect(t.protein).toBe(Math.round(70 * 1.8));
    const fromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(fromMacros - t.kcal)).toBeLessThan(15);
  });

  it('never goes below the safety floor', () => {
    const t = calcTargets({ ...profile, sex: 'female', weightKg: 40, heightCm: 145, age: 60, activity: 'sedentary', pace: 'fast' });
    expect(t.kcal).toBeGreaterThanOrEqual(1200);
  });

  it('keeps carbs low for keto', () => {
    expect(calcTargets({ ...profile, dietType: 'keto' }).carbs).toBe(25);
  });

  it('returns null for an incomplete profile', () => {
    expect(calcTargets({ age: 20 })).toBeNull();
  });
});

describe('items', () => {
  const egg = { name: 'Boiled egg', qty: 2, unit: 'piece', grams: 100, kcal: 155, protein: 13, carbs: 1, fat: 11, fiber: 0 };

  it('scales nutrition linearly with quantity', () => {
    const one = scaleItem(egg, 1);
    expect(one).toMatchObject({ qty: 1, grams: 50, kcal: 78, protein: 6.5, fat: 5.5 });
    expect(scaleItem(egg, 0).kcal).toBe(0);
  });

  it('sums items and tolerates missing fields', () => {
    expect(sumItems([egg, { name: 'x', kcal: 45 }])).toMatchObject({ kcal: 200, protein: 13 });
  });

  it('fallbackAdjust scales remaining meals toward the calories left', () => {
    const meals = [{ id: 'd', name: 'Dinner', items: [{ ...egg, kcal: 1000, qty: 1 }] }];
    const out = fallbackAdjust(meals, { kcal: 2000 }, { kcal: 1500 });
    expect(out[0].items[0].kcal).toBe(500);
  });

  it('flags allergens via synonyms', () => {
    const hits = findAllergens([{ name: 'Paneer tikka' }, { name: 'Rice' }], ['milk']);
    expect(hits).toEqual(['milk (Paneer tikka)']);
    expect(findAllergens([{ name: 'Rice' }], ['milk'])).toEqual([]);
  });

  it('computes deviation from target', () => {
    expect(deviation(2200, 2000)).toBeCloseTo(0.1);
  });
});

describe('dayState', () => {
  const plan = {
    meals: [
      { id: 'b', name: 'Breakfast', items: [{ name: 'Oats', kcal: 300 }] },
      { id: 'l', name: 'Lunch', items: [{ name: 'Dal', kcal: 500 }] },
      { id: 'd', name: 'Dinner', items: [{ name: 'Roti', kcal: 400 }] },
    ],
  };

  it('treats ticked and replaced meals as done', () => {
    const logs = [
      { id: '1', planMealId: 'b', items: plan.meals[0].items },
      { id: '2', replacesMealId: 'l', items: [{ name: 'Pizza', kcal: 800 }] },
    ];
    const s = dayState(plan, logs);
    expect(s.status).toEqual({ b: 'eaten', l: 'replaced' });
    expect(s.remainingMeals.map((m) => m.id)).toEqual(['d']);
    expect(s.consumed.kcal).toBe(1100);
    expect(s.extraLogs).toHaveLength(1);
  });
});

describe('dates', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
