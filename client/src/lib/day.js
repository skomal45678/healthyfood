import { sumLogs } from './nutrition';

export const DEFAULT_SLOTS = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

// Derive a day's status from its plan and logs. A planned meal is "eaten" when
// it was ticked off, or "replaced" when the user logged something else instead.
export function dayState(plan, logs = []) {
  const status = {};
  for (const l of logs) {
    if (l.planMealId) status[l.planMealId] = 'eaten';
    else if (l.replacesMealId && !status[l.replacesMealId]) status[l.replacesMealId] = 'replaced';
  }
  const meals = plan?.meals || [];
  return {
    consumed: sumLogs(logs),
    status,
    remainingMeals: meals.filter((m) => !status[m.id]),
    extraLogs: logs.filter((l) => !l.planMealId),
  };
}

export function mealSlots(plan) {
  const names = plan?.meals?.map((m) => m.name) || [];
  return [...new Set([...names, ...DEFAULT_SLOTS])];
}

// Guess the meal slot from the current time.
export function slotForNow(plan) {
  const h = new Date().getHours();
  const guess = h < 11 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 18 ? 'Snack' : 'Dinner';
  const match = plan?.meals?.find((m) => m.name.toLowerCase().includes(guess.toLowerCase()));
  return match?.name || guess;
}
