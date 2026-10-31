const ITEM_SHAPE =
  '{"name":"Boiled egg","qty":2,"unit":"piece","grams":100,"kcal":155,"protein":13,"carbs":1.1,"fat":11,"fiber":0}';

export const SYSTEM_JSON = `You are HealthyFood, an expert registered dietitian and food scientist.
Use standard nutrition references (USDA FoodData Central, Indian Food Composition Tables) for values.
Every food item MUST include realistic numbers for qty, unit, grams, kcal, protein, carbs, fat, fiber (grams, per the whole quantity).
Respond with ONLY one valid JSON object. No markdown, no code fences, no commentary.`;

export function describeProfile(p = {}) {
  const lines = [
    p.age && `Age: ${p.age}`,
    p.sex && `Sex: ${p.sex}`,
    p.weightKg && `Weight: ${p.weightKg} kg`,
    p.heightCm && `Height: ${p.heightCm} cm`,
    p.goal && `Goal: ${p.goal}`,
    p.activity && `Activity: ${p.activity}`,
    p.dietType && `Diet type: ${p.dietType} (strictly follow this)`,
    p.cuisine && `Preferred cuisine: ${p.cuisine}`,
    p.allergies?.length && `ALLERGIES (never include): ${p.allergies.join(', ')}`,
    p.dislikes?.length && `Excluded foods (never include): ${p.dislikes.join(', ')}`,
    p.budget && `Budget: ${p.budget}`,
    p.notes && `Notes: ${p.notes}`,
  ];
  return lines.filter(Boolean).join('\n');
}

function describeTargets(t) {
  return `${Math.round(t.kcal)} kcal, protein ${Math.round(t.protein)} g, carbs ${Math.round(t.carbs)} g, fat ${Math.round(t.fat)} g${t.fiber ? `, fiber ${Math.round(t.fiber)} g` : ''}`;
}

export function planPrompt({ profile, targets, avoidMeals }) {
  const meals = profile.mealsPerDay || 4;
  return `Create a one-day meal plan.

USER PROFILE
${describeProfile(profile)}

DAILY TARGETS: ${describeTargets(targets)}

Rules:
- Exactly ${meals} meals (e.g. Breakfast, Lunch, Snack, Dinner), each with a suggested time (HH:MM).
- Use common, affordable, easy-to-cook foods from the preferred cuisine with practical household units.
- The sum of all items must be within 5% of the calorie target and close to the macro targets.
${avoidMeals?.length ? `- For variety, avoid repeating these dishes: ${avoidMeals.join(', ')}` : ''}

Return JSON:
{"meals":[{"name":"Breakfast","time":"08:00","notes":"short prep note","items":[${ITEM_SHAPE}]}],"tips":["one short practical tip"]}`;
}

export function swapPrompt({ item, mealName, instruction, profile }) {
  return `Suggest ONE replacement food for "${item.qty} ${item.unit} ${item.name}" (${Math.round(item.kcal)} kcal, P ${item.protein} g, C ${item.carbs} g, F ${item.fat} g)${mealName ? ` in ${mealName}` : ''}.
Keep calories and protein as close as possible.
${instruction ? `User request: ${instruction}` : ''}

USER PROFILE
${describeProfile(profile)}

Return JSON: {"item":${ITEM_SHAPE},"reason":"why this is a good swap"}`;
}

export function regenerateMealPrompt({ meal, instruction, profile, targets }) {
  const current = meal.items.reduce((s, i) => s + (i.kcal || 0), 0);
  const kcal = targets?.kcal ?? current;
  return `Replace this meal with a different "${meal.name}" of about ${Math.round(kcal)} kcal${targets?.protein ? ` and ${Math.round(targets.protein)} g protein` : ''}.
Current meal: ${meal.items.map((i) => i.name).join(', ')}
${instruction ? `User request: ${instruction}` : ''}

USER PROFILE
${describeProfile(profile)}

Return JSON: {"meal":{"name":"${meal.name}","time":"${meal.time || ''}","notes":"short prep note","items":[${ITEM_SHAPE}]}}`;
}

export function imagePrompt(hint) {
  return `Analyse this photo. Identify every distinct food and drink, estimate the portion visible (grams and household units) and its nutrition.
${hint ? `User hint: ${hint}` : ''}
If the photo does not contain food, return {"isFood":false,"dish":"","items":[],"healthScore":0,"notes":"what you see instead"}.
confidence is 0-1 for how sure you are about the identification and portion. healthScore is 1-10.

Return JSON:
{"isFood":true,"dish":"Dal rice with salad","items":[{"name":"Steamed rice","qty":1,"unit":"cup","grams":160,"kcal":205,"protein":4.2,"carbs":45,"fat":0.4,"fiber":0.6,"confidence":0.8}],"healthScore":7,"notes":"one short observation"}`;
}

export function parseFoodPrompt(text) {
  return `Convert this food log into items with nutrition. Assume typical home portions when the amount is not given.
Food log: """${text}"""

Return JSON: {"items":[${ITEM_SHAPE}]}`;
}

export function adjustPrompt({ profile, targets, consumed, remainingMeals }) {
  const left = {
    kcal: Math.max(0, targets.kcal - (consumed.kcal || 0)),
    protein: Math.max(0, targets.protein - (consumed.protein || 0)),
    carbs: Math.max(0, targets.carbs - (consumed.carbs || 0)),
    fat: Math.max(0, targets.fat - (consumed.fat || 0)),
  };
  return `The user has already eaten part of today's food. Rebalance the REMAINING meals so the full day lands on target.

USER PROFILE
${describeProfile(profile)}

DAILY TARGETS: ${describeTargets(targets)}
ALREADY CONSUMED: ${describeTargets({ kcal: 0, protein: 0, carbs: 0, fat: 0, ...consumed })}
LEFT FOR THE REST OF THE DAY: ${describeTargets(left)}

REMAINING PLANNED MEALS:
${JSON.stringify(remainingMeals)}

Rules:
- Keep the same meal names and times. Prefer adjusting quantities; swap or drop items only when needed.
- If the user already exceeded the calorie target, make the remaining meals light and high-protein/high-fibre (never below ~150 kcal per meal).
- Make the remaining meals together total close to ${Math.round(left.kcal)} kcal.

Return JSON: {"meals":[{"name":"Dinner","time":"20:00","notes":"","items":[${ITEM_SHAPE}]}],"explanation":"1-2 sentences on what changed and why"}`;
}

export function coachSystem(context = {}) {
  return `You are HealthyFood Coach, a friendly, evidence-based nutrition coach.
Give concise, practical answers (under 180 words unless asked for more), using short bullet points where helpful.
Respect the user's diet type and allergies. You are not a doctor: for medical conditions, advise consulting a professional.

USER CONTEXT (JSON):
${JSON.stringify(context).slice(0, 6000)}`;
}

export function groceryPrompt({ meals, days }) {
  const items = meals.flatMap((m) => m.items.map((i) => `${i.qty} ${i.unit} ${i.name}`));
  return `Create a consolidated grocery shopping list for ${days || 1} day(s) of these planned foods.
Merge duplicates, convert to shop-friendly quantities (kg, g, litres, dozen, packs), and group by store section
(e.g. Produce, Dairy & Eggs, Grains & Bread, Protein, Pantry & Spices, Other).

Foods:
${items.join('\n')}

Return JSON: {"categories":[{"name":"Produce","items":[{"name":"Spinach","quantity":"250 g"}]}]}`;
}

export function recipePrompt({ meal, profile }) {
  return `Write a simple recipe to prepare this meal: ${meal.items.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(', ')}.
${profile ? describeProfile(profile) : ''}

Return JSON: {"title":"${meal.name}","prepMinutes":20,"servings":1,"ingredients":["..."],"steps":["..."],"tips":["..."]}`;
}
