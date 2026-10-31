import { z } from 'zod';

// Models sometimes send numbers as strings ("250 kcal") or omit fields, so
// numeric fields are coerced and defaulted instead of rejected.
const num = (fallback = 0) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? parseFloat(v.replace(/[^\d.-]/g, '')) : v),
    z.number().finite().nonnegative()
  ).catch(fallback);

const str = (fallback = '') =>
  z.preprocess((v) => (v == null ? fallback : String(v)), z.string()).catch(fallback);

export const FoodItem = z.object({
  name: z.string().min(1),
  qty: num(1),
  unit: str('serving'),
  grams: num(0),
  kcal: num(0),
  protein: num(0),
  carbs: num(0),
  fat: num(0),
  fiber: num(0),
});

export const Meal = z.object({
  name: z.string().min(1),
  time: str(''),
  items: z.array(FoodItem).min(1),
  notes: str(''),
});

export const DayPlan = z.object({
  meals: z.array(Meal).min(1),
  tips: z.array(z.coerce.string()).catch([]),
});

export const SingleMeal = z.object({ meal: Meal });

export const SwapResult = z.object({
  item: FoodItem,
  reason: str(''),
});

export const PhotoAnalysis = z.object({
  isFood: z.boolean().catch(true),
  dish: str('Meal'),
  items: z.array(FoodItem.extend({ confidence: num(0.5) })).catch([]),
  healthScore: num(5),
  notes: str(''),
});

export const ParsedFood = z.object({
  items: z.array(FoodItem).min(1),
});

export const AdjustResult = z.object({
  meals: z.array(Meal),
  explanation: str(''),
});

export const GroceryList = z.object({
  categories: z
    .array(
      z.object({
        name: z.string(),
        items: z.array(z.object({ name: z.string(), quantity: str('') })),
      })
    )
    .min(1),
});

export const Recipe = z.object({
  title: str('Recipe'),
  prepMinutes: num(15),
  servings: num(1),
  ingredients: z.array(z.coerce.string()).min(1),
  steps: z.array(z.coerce.string()).min(1),
  tips: z.array(z.coerce.string()).catch([]),
});

// ---- Request bodies -------------------------------------------------------

const Targets = z.object({
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number().optional(),
});

export const ProfileInput = z
  .object({
    age: z.number().optional(),
    sex: z.string().optional(),
    weightKg: z.number().optional(),
    heightCm: z.number().optional(),
    goal: z.string().optional(),
    activity: z.string().optional(),
    dietType: z.string().optional(),
    cuisine: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    dislikes: z.array(z.string()).optional(),
    mealsPerDay: z.number().optional(),
    budget: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export const GeneratePlanBody = z.object({
  profile: ProfileInput,
  targets: Targets,
  avoidMeals: z.array(z.string()).max(60).optional(),
  model: z.string().optional(),
});

export const SwapBody = z.object({
  item: FoodItem,
  mealName: z.string().optional(),
  instruction: z.string().max(300).optional(),
  profile: ProfileInput,
  model: z.string().optional(),
});

export const RegenerateMealBody = z.object({
  meal: Meal,
  instruction: z.string().max(300).optional(),
  profile: ProfileInput,
  targets: Targets.partial().optional(),
  model: z.string().optional(),
});

export const AnalyzeImageBody = z.object({
  image: z
    .string()
    .startsWith('data:image/')
    .max(8_000_000, 'Image too large, please use a smaller photo'),
  hint: z.string().max(300).optional(),
  model: z.string().optional(),
});

export const ParseFoodBody = z.object({
  text: z.string().min(1).max(1000),
  model: z.string().optional(),
});

export const AdjustBody = z.object({
  profile: ProfileInput,
  targets: Targets,
  consumed: Targets.partial(),
  remainingMeals: z.array(Meal).min(1),
  model: z.string().optional(),
});

export const CoachBody = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .min(1)
    .max(30),
  context: z.record(z.string(), z.any()).optional(),
  model: z.string().optional(),
});

export const GroceryBody = z.object({
  meals: z.array(Meal).min(1).max(60),
  days: z.number().min(1).max(14).optional(),
  model: z.string().optional(),
});

export const RecipeBody = z.object({
  meal: Meal,
  profile: ProfileInput.optional(),
  model: z.string().optional(),
});
