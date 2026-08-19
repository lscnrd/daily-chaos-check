import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { Footprints, Droplet, Apple, Moon, Sparkle, ChevronLeft, ChevronRight, ChevronDown, Plus, Minus, Check, Beef, Settings2, X, Users, ShoppingCart, Trash2, Flame, Scale, Bell, BellOff, Wine, BookOpen, PenLine, Wind, Footprints as Walk, Ban } from "lucide-react";
import { sendBrowserNotification } from "./notifications-bridge.js";
import { requestNotificationPermission } from "./notifications.js";
import Onboarding from "./Onboarding.jsx";

const DOMAINS = [
  { key: "move", label: "Move", icon: Footprints, unit: "min", goal: 30 },
  { key: "water", label: "Water", icon: Droplet, unit: "glasses", goal: 8, step: 1 },
  { key: "fuel", label: "Fuel", icon: Apple, unit: "items", goal: 5, step: 1 },
  { key: "sleep", label: "Rest", icon: Moon, unit: "hrs", goal: 8, step: 0.5 },
];

const ALLERGENS = [
  { id: "gluten", label: "Gluten" },
  { id: "dairy", label: "Dairy" },
  { id: "egg", label: "Egg" },
  { id: "nuts", label: "Nuts" },
  { id: "fish", label: "Fish" },
  { id: "soy", label: "Soy" },
];

const CATEGORY_LABELS = { breakfast: "Breakfast", snack: "Snack", lunch: "Lunch", dinner: "Dinner" };

const GOALS = [
  { id: "lose_weight", label: "Lose weight" },
  { id: "improve_fitness", label: "Improve fitness" },
  { id: "get_fit", label: "Get in shape" },
];

const ACTIVITIES = [
  { id: "walking", label: "Walking", met: 3.5 },
  { id: "running", label: "Running", met: 9.8 },
  { id: "cycling", label: "Cycling", met: 7.5 },
  { id: "swimming", label: "Swimming", met: 6.0 },
  { id: "strength", label: "Strength training", met: 5.0 },
  { id: "yoga", label: "Yoga", met: 2.5 },
  { id: "hiit", label: "HIIT", met: 8.0 },
  { id: "football", label: "Football", met: 7.0 },
  { id: "hiking", label: "Hiking", met: 6.0 },
  { id: "kickboxing", label: "Kickboxing", met: 10.3 },
];
const DEFAULT_WEIGHT_KG = 70;
const MIND_OPTIONS = [
  { id: "wine", label: "Glass of wine", icon: Wine, kcal: 125, hasNote: false },
  { id: "reading", label: "Read a book", icon: BookOpen, kcal: 0, hasNote: false },
  { id: "gratitude", label: "Wrote something I'm grateful for", icon: PenLine, kcal: 0, hasNote: true },
  { id: "meditation", label: "Meditation / breathing", icon: Wind, kcal: 0, hasNote: false },
  { id: "walk", label: "Mindful walk", icon: Walk, kcal: 0, hasNote: false },
  { id: "other", label: "Something else", icon: Sparkle, kcal: 0, hasNote: true },
];
const LIGHT_KCAL_THRESHOLD = { breakfast: 350, snack: 150, lunch: 420, dinner: 460 };
function isLight(recipe, slot) {
  return recipeTotals(recipe).kcal <= LIGHT_KCAL_THRESHOLD[slot.category];
}
function sortForGoal(list, isWeightLossGoal) {
  if (!isWeightLossGoal) return list;
  return [...list].sort((a, b) => recipeTotals(a).kcal - recipeTotals(b).kcal);
}

// Ingredient macro values are estimates (per stated amount), rounded for
// readability — handy for planning, not a certified nutrition label.
const BREAKFASTS = [
  {
    name: "Quark-yogurt bowl with berries & walnuts",
    allergens: ["dairy", "nuts"],
    ingredients: [
      { name: "250 g low-fat quark", protein: 30, carbs: 10, fat: 0.5, kcal: 168 },
      { name: "100 g Greek yogurt", protein: 9, carbs: 4, fat: 10, kcal: 133 },
      { name: "1 handful berries (80 g)", protein: 0.6, carbs: 9.6, fat: 0.2, kcal: 40 },
      { name: "15 g walnuts, roughly chopped", protein: 2.3, carbs: 2.1, fat: 9.8, kcal: 98 },
      { name: "1 tbsp chia seeds", protein: 2, carbs: 5, fat: 3.7, kcal: 58 },
      { name: "Drizzle of honey (optional)", protein: 0, carbs: 8, fat: 0, kcal: 30 },
    ],
    steps: ["Mix the quark and Greek yogurt in a bowl.", "Top with berries, walnuts and chia seeds.", "Finish with a small drizzle of honey to taste."],
  },
  {
    name: "Protein pancakes with quark and banana",
    allergens: ["egg", "dairy"],
    ingredients: [
      { name: "2 eggs", protein: 12, carbs: 1, fat: 10, kcal: 140 },
      { name: "100 g quark", protein: 12, carbs: 4, fat: 0.2, kcal: 67 },
      { name: "1 ripe banana (120 g)", protein: 1.3, carbs: 27, fat: 0.4, kcal: 105 },
      { name: "30 g rolled oats", protein: 3.9, carbs: 18, fat: 2.1, kcal: 113 },
      { name: "Pinch of cinnamon", protein: 0, carbs: 0.3, fat: 0, kcal: 2 },
    ],
    steps: ["Blend all ingredients into a smooth batter.", "Cook small pancakes, 2-3 minutes per side.", "Serve with extra quark or berries."],
  },
  {
    name: "Scrambled eggs with spinach and feta on wholegrain toast",
    allergens: ["egg", "dairy", "gluten"],
    ingredients: [
      { name: "3 eggs", protein: 18, carbs: 1.5, fat: 15, kcal: 210 },
      { name: "1 handful spinach (30 g)", protein: 0.9, carbs: 1.1, fat: 0.1, kcal: 7 },
      { name: "30 g feta", protein: 4.2, carbs: 1.2, fat: 6.3, kcal: 79 },
      { name: "1 slice wholegrain bread", protein: 4, carbs: 15, fat: 1, kcal: 90 },
      { name: "Salt and pepper", protein: 0, carbs: 0, fat: 0, kcal: 0 },
    ],
    steps: ["Wilt the spinach briefly in a pan.", "Beat the eggs, add to the pan and scramble.", "Fold through the crumbled feta and serve on toasted bread."],
  },
  {
    name: "Skyr with granola, almonds and raspberries",
    allergens: ["dairy", "nuts"],
    ingredients: [
      { name: "200 g skyr", protein: 22, carbs: 8, fat: 0.4, kcal: 126 },
      { name: "25 g granola", protein: 2, carbs: 15, fat: 4.5, kcal: 113 },
      { name: "15 g almonds", protein: 3.2, carbs: 3.3, fat: 7.5, kcal: 87 },
      { name: "1 handful raspberries (60 g)", protein: 0.7, carbs: 7.2, fat: 0.4, kcal: 31 },
    ],
    steps: ["Spoon the skyr into a bowl.", "Top with granola, almonds and raspberries."],
  },
  {
    name: "Cottage cheese toast with tomato and egg",
    allergens: ["dairy", "gluten", "egg"],
    ingredients: [
      { name: "150 g cottage cheese", protein: 16.5, carbs: 5.1, fat: 6.5, kcal: 147 },
      { name: "1 slice wholegrain bread", protein: 4, carbs: 15, fat: 1, kcal: 90 },
      { name: "1 boiled egg", protein: 6, carbs: 0.5, fat: 5, kcal: 70 },
      { name: "1 tomato", protein: 1.1, carbs: 4.8, fat: 0.2, kcal: 22 },
      { name: "Black pepper", protein: 0, carbs: 0, fat: 0, kcal: 0 },
    ],
    steps: ["Toast the bread.", "Spread with cottage cheese and top with tomato and egg slices.", "Season with black pepper."],
  },
  {
    name: "Tofu scramble with avocado on wholegrain toast",
    allergens: ["soy", "gluten"],
    ingredients: [
      { name: "200 g firm tofu", protein: 16, carbs: 4, fat: 9.6, kcal: 152 },
      { name: "1/2 avocado (100 g)", protein: 2, carbs: 9, fat: 15, kcal: 160 },
      { name: "1 slice wholegrain bread", protein: 4, carbs: 15, fat: 1, kcal: 90 },
      { name: "1 handful spinach (30 g), turmeric", protein: 0.9, carbs: 1.1, fat: 0.1, kcal: 7 },
      { name: "1 tsp olive oil", protein: 0, carbs: 0, fat: 5, kcal: 45 },
    ],
    steps: ["Crumble the tofu and sauté with a pinch of turmeric until golden.", "Add the spinach and cook until wilted.", "Serve over toasted wholegrain bread with sliced avocado."],
  },
  {
    name: "Egg white and vegetable muffins",
    allergens: ["egg"],
    ingredients: [
      { name: "6 egg whites (200 g)", protein: 22, carbs: 1.5, fat: 0.2, kcal: 100 },
      { name: "Bell pepper (50 g)", protein: 0.5, carbs: 3, fat: 0.1, kcal: 15 },
      { name: "1 handful spinach (30 g)", protein: 0.9, carbs: 1.1, fat: 0.1, kcal: 7 },
      { name: "Onion (30 g)", protein: 0.3, carbs: 3, fat: 0, kcal: 12 },
      { name: "Olive oil spray, salt and pepper", protein: 0, carbs: 0, fat: 2, kcal: 18 },
    ],
    steps: ["Whisk the egg whites with a pinch of salt and pepper.", "Stir in the chopped bell pepper, spinach and onion.", "Pour into a muffin tin and bake at 180°C/350°F for 18-20 minutes."],
  },
];

const LUNCHES = [
  {
    name: "Chicken quinoa bowl with avocado",
    allergens: [],
    ingredients: [
      { name: "150 g chicken breast", protein: 34.5, carbs: 0, fat: 3, kcal: 165 },
      { name: "80 g quinoa (dry weight)", protein: 11.2, carbs: 51.2, fat: 4.8, kcal: 294 },
      { name: "1 handful spinach (30 g)", protein: 0.9, carbs: 1.1, fat: 0.1, kcal: 7 },
      { name: "1/2 avocado (100 g)", protein: 2, carbs: 9, fat: 15, kcal: 160 },
      { name: "Cherry tomatoes to taste (50 g)", protein: 0.4, carbs: 2, fat: 0.1, kcal: 9 },
      { name: "Lemon juice and olive oil", protein: 0, carbs: 0, fat: 14, kcal: 119 },
    ],
    steps: ["Cook the quinoa according to the package and let it cool.", "Cook the chicken breast through and slice.", "Combine everything in a bowl and drizzle with lemon juice and olive oil."],
  },
  {
    name: "Tuna salad with white beans and egg",
    allergens: ["fish", "egg"],
    ingredients: [
      { name: "1 can tuna in water (120 g)", protein: 31, carbs: 0, fat: 1.2, kcal: 139 },
      { name: "100 g white beans", protein: 7, carbs: 16, fat: 0.5, kcal: 95 },
      { name: "1 boiled egg", protein: 6, carbs: 0.5, fat: 5, kcal: 70 },
      { name: "1/2 cucumber (150 g)", protein: 1, carbs: 3, fat: 0.2, kcal: 23 },
      { name: "Red onion (20 g)", protein: 0.2, carbs: 2, fat: 0, kcal: 8 },
      { name: "Olive oil and lemon", protein: 0, carbs: 0, fat: 14, kcal: 119 },
    ],
    steps: ["Drain the tuna and beans.", "Mix with sliced cucumber and red onion.", "Top with halved egg, olive oil and lemon juice."],
  },
  {
    name: "Greek chicken wrap with tzatziki",
    allergens: ["gluten", "dairy"],
    ingredients: [
      { name: "150 g chicken breast", protein: 34.5, carbs: 0, fat: 3, kcal: 165 },
      { name: "1 wholegrain wrap", protein: 6, carbs: 30, fat: 3, kcal: 170 },
      { name: "3 tbsp tzatziki (45 g)", protein: 2, carbs: 2, fat: 3, kcal: 45 },
      { name: "Lettuce, tomato, red onion", protein: 0.5, carbs: 3, fat: 0.1, kcal: 15 },
    ],
    steps: ["Cook the chicken through and slice.", "Fill the wrap with lettuce, tomato, onion and chicken.", "Drizzle with tzatziki and roll up."],
  },
  {
    name: "Lentil soup with smoked chicken",
    allergens: ["gluten"],
    ingredients: [
      { name: "100 g red lentils (dry)", protein: 24, carbs: 60, fat: 1, kcal: 352 },
      { name: "100 g smoked chicken breast", protein: 27, carbs: 1, fat: 3, kcal: 140 },
      { name: "Vegetable stock", protein: 0, carbs: 1, fat: 0, kcal: 10 },
      { name: "1 carrot, 1 onion", protein: 1, carbs: 9, fat: 0.2, kcal: 40 },
      { name: "1 slice wholegrain bread", protein: 4, carbs: 15, fat: 1, kcal: 90 },
    ],
    steps: ["Briefly sauté the onion and carrot.", "Add lentils and stock and simmer for 15 minutes.", "Stir through the chicken and serve with bread."],
  },
  {
    name: "Egg salad with wholegrain crackers",
    allergens: ["egg", "dairy", "gluten"],
    ingredients: [
      { name: "3 boiled eggs", protein: 18, carbs: 1.5, fat: 15, kcal: 210 },
      { name: "2 tbsp Greek yogurt (30 g)", protein: 2.7, carbs: 1.2, fat: 3, kcal: 40 },
      { name: "Mustard, chives", protein: 0.2, carbs: 0.5, fat: 0.2, kcal: 5 },
      { name: "Wholegrain crackers (21 g)", protein: 2, carbs: 14, fat: 3, kcal: 90 },
    ],
    steps: ["Mash the eggs and mix with yogurt, mustard and chives.", "Serve with crackers."],
  },
];

const DINNERS = [
  {
    name: "Salmon with lentils and broccoli",
    allergens: ["fish"],
    ingredients: [
      { name: "150 g salmon fillet", protein: 30, carbs: 0, fat: 19.5, kcal: 312 },
      { name: "100 g lentils (canned, drained)", protein: 9, carbs: 20, fat: 0.4, kcal: 116 },
      { name: "150 g broccoli", protein: 4.2, carbs: 10.5, fat: 0.6, kcal: 51 },
      { name: "1 clove garlic", protein: 0.2, carbs: 1, fat: 0, kcal: 4 },
      { name: "Olive oil and lemon", protein: 0, carbs: 0, fat: 14, kcal: 119 },
    ],
    steps: ["Pan-fry the salmon 4-5 minutes per side.", "Steam the broccoli until tender-crisp.", "Warm the lentils with garlic in a splash of olive oil.", "Serve together with lemon."],
  },
  {
    name: "Chicken breast with sweet potato and green beans",
    allergens: [],
    ingredients: [
      { name: "180 g chicken breast", protein: 41.4, carbs: 0, fat: 3.6, kcal: 198 },
      { name: "1 sweet potato (150 g)", protein: 2, carbs: 27, fat: 0.1, kcal: 112 },
      { name: "150 g green beans", protein: 2.7, carbs: 10.5, fat: 0.15, kcal: 47 },
      { name: "Garlic, olive oil", protein: 0, carbs: 0.5, fat: 14, kcal: 123 },
    ],
    steps: ["Roast the diced sweet potato (200°C/400°F, 25 min).", "Cook the chicken through with garlic.", "Steam the green beans and serve together."],
  },
  {
    name: "Beef meatballs with courgette noodles",
    allergens: ["dairy"],
    ingredients: [
      { name: "200 g lean ground beef", protein: 42, carbs: 0, fat: 10, kcal: 274 },
      { name: "1 courgette (200 g, spiralized)", protein: 2.4, carbs: 6.2, fat: 0.6, kcal: 34 },
      { name: "Tomato sauce (100 g)", protein: 1.5, carbs: 7, fat: 0.5, kcal: 35 },
      { name: "Garlic", protein: 0.2, carbs: 1, fat: 0, kcal: 4 },
      { name: "Parmesan (10 g)", protein: 4, carbs: 0, fat: 3, kcal: 40 },
    ],
    steps: ["Shape the beef into meatballs and cook through.", "Add tomato sauce and simmer.", "Serve over courgette noodles with a sprinkle of Parmesan."],
  },
  {
    name: "Tofu stir-fry with edamame and brown rice",
    allergens: ["soy"],
    ingredients: [
      { name: "200 g firm tofu", protein: 16, carbs: 4, fat: 9.6, kcal: 152 },
      { name: "80 g edamame", protein: 8.8, carbs: 7.2, fat: 4, kcal: 98 },
      { name: "Mixed vegetables (100 g)", protein: 2, carbs: 7, fat: 0.3, kcal: 35 },
      { name: "Soy sauce, ginger", protein: 1, carbs: 1, fat: 0, kcal: 8 },
      { name: "70 g brown rice (dry)", protein: 4.9, carbs: 53.2, fat: 1.4, kcal: 244 },
    ],
    steps: ["Cook the rice.", "Pan-fry the tofu until golden and add vegetables, edamame, ginger and soy sauce.", "Serve over the rice."],
  },
  {
    name: "Cod with lentil-tomato stew",
    allergens: ["fish"],
    ingredients: [
      { name: "180 g cod fillet", protein: 32.4, carbs: 0, fat: 1.3, kcal: 148 },
      { name: "100 g lentils (canned)", protein: 9, carbs: 20, fat: 0.4, kcal: 116 },
      { name: "Diced tomatoes (100 g)", protein: 1.2, carbs: 4, fat: 0.3, kcal: 20 },
      { name: "Onion, garlic", protein: 0.3, carbs: 2, fat: 0, kcal: 10 },
      { name: "Paprika powder", protein: 0, carbs: 0, fat: 0, kcal: 2 },
    ],
    steps: ["Sauté onion and garlic, add tomatoes and lentils and let reduce.", "Place the cod on top and cook gently for 8-10 minutes."],
  },
];

const SNACKS = [
  {
    name: "Handful of almonds with an apple",
    allergens: ["nuts"],
    ingredients: [
      { name: "20 g almonds", protein: 4.2, carbs: 4.4, fat: 10, kcal: 116 },
      { name: "1 apple (180 g)", protein: 0.5, carbs: 25, fat: 0.3, kcal: 95 },
    ],
    steps: ["Combine and enjoy as a snack."],
  },
  {
    name: "Quark with cinnamon",
    allergens: ["dairy"],
    ingredients: [
      { name: "150 g low-fat quark", protein: 18, carbs: 6, fat: 0.3, kcal: 100 },
      { name: "Pinch of cinnamon", protein: 0, carbs: 0.3, fat: 0, kcal: 2 },
    ],
    steps: ["Mix the quark with cinnamon."],
  },
  {
    name: "Protein shake with water or milk",
    allergens: ["dairy"],
    ingredients: [
      { name: "1 scoop whey protein (30 g)", protein: 24, carbs: 3, fat: 1.5, kcal: 110 },
      { name: "250 ml water or low-fat milk", protein: 0, carbs: 0, fat: 0, kcal: 0 },
    ],
    steps: ["Shake well and drink immediately."],
  },
  {
    name: "Two hard-boiled eggs",
    allergens: ["egg"],
    ingredients: [{ name: "2 eggs", protein: 12, carbs: 1, fat: 10, kcal: 140 }],
    steps: ["Boil the eggs for 8-9 minutes and peel."],
  },
  {
    name: "Skyr with a handful of nuts",
    allergens: ["dairy", "nuts"],
    ingredients: [
      { name: "175 g skyr", protein: 19.3, carbs: 7, fat: 0.4, kcal: 110 },
      { name: "15 g mixed nuts", protein: 2.7, carbs: 3, fat: 7.5, kcal: 90 },
    ],
    steps: ["Spoon the skyr into a bowl and top with nuts."],
  },
  {
    name: "Wholegrain cracker with cottage cheese",
    allergens: ["gluten", "dairy"],
    ingredients: [
      { name: "3 wholegrain crackers (21 g)", protein: 2, carbs: 14, fat: 3, kcal: 90 },
      { name: "80 g cottage cheese", protein: 8.8, carbs: 2.7, fat: 3.4, kcal: 78 },
    ],
    steps: ["Spread the crackers with cottage cheese."],
  },
  {
    name: "Turkey slices with rice cakes",
    allergens: [],
    ingredients: [
      { name: "60 g turkey breast slices", protein: 13, carbs: 0.5, fat: 0.5, kcal: 62 },
      { name: "2 rice cakes (18 g)", protein: 0.7, carbs: 14, fat: 0.2, kcal: 70 },
    ],
    steps: ["Serve the turkey slices on the rice cakes."],
  },
];

const MEAL_SLOTS = [
  { id: "breakfast", label: "Breakfast", category: "breakfast", variants: BREAKFASTS, offset: 0 },
  { id: "snack1", label: "Morning snack", category: "snack", variants: SNACKS, offset: 0 },
  { id: "lunch", label: "Lunch", category: "lunch", variants: LUNCHES, offset: 0 },
  { id: "snack2", label: "Afternoon snack", category: "snack", variants: SNACKS, offset: 3 },
  { id: "dinner", label: "Dinner", category: "dinner", variants: DINNERS, offset: 0 },
];

const DAY_MS = 86400000;
function dayIndexFor(date) {
  return Math.floor(date.getTime() / DAY_MS);
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
function recipeTotals(recipe) {
  if (recipe.totals) return recipe.totals;
  return recipe.ingredients.reduce(
    (acc, ing) => ({
      protein: acc.protein + (ing.protein || 0),
      carbs: acc.carbs + (ing.carbs || 0),
      fat: acc.fat + (ing.fat || 0),
      kcal: acc.kcal + (ing.kcal || 0),
    }),
    { protein: 0, carbs: 0, fat: 0, kcal: 0 }
  );
}
function communityForSlot(slot, community) {
  return community.filter((r) => r.slotCategory === slot.category);
}
// Rough split of a daily calorie target across the 5 meal slots.
const SLOT_KCAL_SHARE = { breakfast: 0.2, snack1: 0.1, lunch: 0.3, snack2: 0.1, dinner: 0.3 };
// Scales every number found in an ingredient description proportionally.
// Approximate — quantities won't always round to practical kitchen amounts.
function scaleQuantityText(text, multiplier) {
  if (multiplier === 1) return text;
  return text.replace(/\d+(\.\d+)?/g, (m) => {
    const v = parseFloat(m) * multiplier;
    return (Math.round(v * 10) / 10).toString();
  });
}
function recipeKey(source, recipe) {
  return source === "builtin" ? `builtin:${recipe.name}` : `community:${recipe.id}`;
}
function blockedRecipeLabel(key, community) {
  if (key.startsWith("builtin:")) return key.slice("builtin:".length);
  const id = key.slice("community:".length);
  const found = community.find((r) => r.id === id);
  return found ? found.name : "Removed community recipe";
}
function resolveRecipeForSlot(slot, activeDate, allergies, day, community, blockedRecipes) {
  const communityOptions = communityForSlot(slot, community);
  const blocked = blockedRecipes || [];
  const isBlocked = (source, recipe) => blocked.includes(recipeKey(source, recipe));
  const selection = day.selections && day.selections[slot.id];
  if (selection) {
    if (selection.source === "builtin") {
      const found = slot.variants.find((v) => v.name === selection.ref);
      if (found && !isBlocked("builtin", found)) return { recipe: found, isFallback: false, isManual: true };
    } else if (selection.source === "community") {
      const found = communityOptions.find((r) => r.id === selection.ref);
      if (found && !isBlocked("community", found)) return { recipe: found, isFallback: false, isManual: true };
    }
  }
  const nonBlockedBuiltins = slot.variants.filter((v) => !isBlocked("builtin", v));
  const nonBlockedCommunity = communityOptions.filter((r) => !isBlocked("community", r));
  const filteredBuiltins = allergies.length ? nonBlockedBuiltins.filter((v) => !v.allergens.some((a) => allergies.includes(a))) : nonBlockedBuiltins;
  const filteredCommunity = allergies.length ? nonBlockedCommunity.filter((r) => !r.allergens.some((a) => allergies.includes(a))) : nonBlockedCommunity;
  let pool = [...filteredBuiltins, ...filteredCommunity];
  let isFallback = false;
  if (pool.length === 0) {
    pool = [...nonBlockedBuiltins, ...nonBlockedCommunity];
    isFallback = allergies.length > 0;
    if (pool.length === 0) {
      // Absolute last resort if someone has blocked or excluded everything in a slot.
      pool = [...slot.variants, ...communityOptions];
    }
  }
  const idx = (dayIndexFor(activeDate) + slot.offset) % pool.length;
  return { recipe: pool[idx], isFallback, isManual: false };
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}
function fmtDay(d) {
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}
function emptyDay() {
  return { move: 0, water: 0, sleep: 0, mindLog: [], activities: [], meals: { breakfast: false, snack1: false, lunch: false, snack2: false, dinner: false }, selections: {} };
}
function mealsCount(day) {
  const meals = (day && day.meals) || {};
  return Object.values(meals).filter(Boolean).length;
}
function activityMinutes(day) {
  const activities = (day && day.activities) || [];
  return activities.reduce((sum, a) => sum + a.minutes, 0);
}
function activityKcal(day) {
  const activities = (day && day.activities) || [];
  return activities.reduce((sum, a) => sum + a.kcal, 0);
}
// Averages logged exercise calories over the trailing week (ending on the
// viewed date) so the calorie budget reflects your typical training pattern
// rather than only spiking on days you happen to log a workout.
function rollingActivityAllowance(entries, referenceDate, windowDays = 7) {
  let total = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dayObj = entries[dateKey(d)];
    if (dayObj) total += activityKcal(dayObj);
  }
  return total / windowDays;
}
function getValue(day, key) {
  if (key === "fuel") return mealsCount(day);
  if (key === "move") return activityMinutes(day);
  return (day && day[key]) || 0;
}
function completion(day) {
  if (!day) return 0;
  const parts = DOMAINS.map((d) => Math.min(1, getValue(day, d.key) / d.goal));
  parts.push(day.mindLog && day.mindLog.length > 0 ? 1 : 0);
  return parts.reduce((a, b) => a + b, 0) / (DOMAINS.length + 1);
}
function mindKcal(day) {
  return ((day && day.mindLog) || []).reduce((sum, m) => sum + (m.kcal || 0), 0);
}
// Consecutive days (ending today) with at least 60% of the trail completed.
function currentStreak(entries, todayDate) {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const dayObj = entries[dateKey(d)];
    if (dayObj && completion(dayObj) >= 0.6) streak++;
    else break;
  }
  return streak;
}
function timeSince(iso) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
// Fixed rhythm: a glass of water between every logging moment, in meal
// order, ending with self-care and movement. Water appears 8 times to
// match the daily water goal.
const SUGGESTION_SEQUENCE = [
  { type: "water" },
  { type: "meal", slotId: "breakfast" },
  { type: "sleep" },
  { type: "water" },
  { type: "meal", slotId: "snack1" },
  { type: "water" },
  { type: "meal", slotId: "lunch" },
  { type: "water" },
  { type: "meal", slotId: "snack2" },
  { type: "water" },
  { type: "meal", slotId: "dinner" },
  { type: "water" },
  { type: "mind" },
  { type: "water" },
  { type: "move" },
  { type: "water" },
];
function nextSuggestion(day) {
  let waterCount = 0;
  for (const step of SUGGESTION_SEQUENCE) {
    if (step.type === "water") {
      waterCount++;
      if (getValue(day, "water") < waterCount) return { type: "water", text: "Drink a glass of water" };
    } else if (step.type === "meal") {
      const meals = day.meals || {};
      if (!meals[step.slotId]) {
        const slot = MEAL_SLOTS.find((s) => s.id === step.slotId);
        return { type: "meal", text: `Log your ${slot.label.toLowerCase()}`, slotId: step.slotId };
      }
    } else if (step.type === "sleep") {
      if (!day.sleep) return { type: "sleep", text: "Log last night's sleep (use the Rest card below)" };
    } else if (step.type === "mind") {
      if (!(day.mindLog && day.mindLog.length > 0)) return { type: "mind", text: "Take a self-care moment" };
    } else if (step.type === "move") {
      if (activityMinutes(day) < 30) return { type: "move", text: "Log some movement" };
    }
  }
  return null;
}
function bmiCategory(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}
const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Desk job, little movement", multiplier: 1.2 },
  { id: "light", label: "Some walking/standing (e.g. teaching, retail)", multiplier: 1.375 },
  { id: "moderate", label: "On your feet most of the day (e.g. nursing, hospitality)", multiplier: 1.55 },
  { id: "active", label: "Physically demanding (e.g. construction, manual labor)", multiplier: 1.725 },
];
function lifestyleMultiplier(profile) {
  const level = ACTIVITY_LEVELS.find((l) => l.id === profile.lifestyleActivity);
  return level ? level.multiplier : 1.375;
}
// Mifflin-St Jeor BMR, times your job/lifestyle activity multiplier, when we
// have enough profile detail; falls back to a rough weight-only estimate
// (still adjusted by the same multiplier) otherwise.
function maintenanceEstimateFor(profile, weightKg) {
  const heightCm = parseFloat(profile.heightCm);
  const age = parseFloat(profile.age);
  const multiplier = lifestyleMultiplier(profile);
  if (profile.sex && heightCm && age) {
    const bmr = profile.sex === "male" ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5 : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    return { value: bmr * multiplier, precise: true };
  }
  return { value: weightKg * 30 * (multiplier / 1.375), precise: false };
}

// Hilly trail path — hand-tuned so checkpoints sit near the curve
const TRAIL_PATH = "M 10 90 C 70 90, 70 30, 130 30 S 190 90, 250 90 S 310 20, 370 20 S 430 90, 490 90";
const CHECKPOINTS = [
  { x: 10, y: 90 },
  { x: 130, y: 30 },
  { x: 250, y: 90 },
  { x: 370, y: 20 },
];

const EMPTY_FORM = { name: "", category: "breakfast", allergens: [], ingredients: "", steps: "", protein: "", carbs: "", fat: "", kcal: "", authorName: "" };
const EMPTY_PROFILE = { name: "", goal: "", weightKg: "", heightCm: "", bodyFatPct: "", targetWeightKg: "", weeklyRateKg: "0.5", sex: "", age: "", scaleRecipes: false, lifestyleActivity: "light", startWeightKg: "", onboardingComplete: false };
const SHOPPING_RANGES = [3, 7, 14];
const RATE_OPTIONS = [0.25, 0.5, 0.75, 1];
const SAFE_MIN_KCAL = 1200;

const EMPTY_REMINDERS = { enabled: false, waterMinutes: 60, foodMinutes: 180 };

export default function HealthTrailPlanner() {
  const [data, setData] = useState({ entries: {}, allergies: [], profile: EMPTY_PROFILE, checkedItems: {}, weightLog: {}, reminders: EMPTY_REMINDERS, blockedRecipes: [] });
  const [community, setCommunity] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [pickerOpenFor, setPickerOpenFor] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [logActivityOpen, setLogActivityOpen] = useState(false);
  const [activityPick, setActivityPick] = useState("walking");
  const [activityMinutesInput, setActivityMinutesInput] = useState(30);
  const [shoppingRange, setShoppingRange] = useState(7);
  const [weightInput, setWeightInput] = useState("");
  const [mindPick, setMindPick] = useState("wine");
  const [mindNote, setMindNote] = useState("");
  const [logMindOpen, setLogMindOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [notifPermission, setNotifPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const [undo, setUndo] = useState(null);
  const [nextWaterAt, setNextWaterAt] = useState(null);
  const [nextFoodAt, setNextFoodAt] = useState(null);
  const [, forceTick] = useState(0);

  const entries = data.entries || {};
  const allergies = data.allergies || [];
  const profile = data.profile || EMPTY_PROFILE;
  const checkedItems = data.checkedItems || {};
  const weightLog = data.weightLog || {};
  const reminders = data.reminders || EMPTY_REMINDERS;
  const blockedRecipes = data.blockedRecipes || [];
  const weightKg = parseFloat(profile.weightKg) || DEFAULT_WEIGHT_KG;
  const isWeightLossGoal = profile.goal === "lose_weight";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeDate = new Date(today);
  activeDate.setDate(activeDate.getDate() + offset);
  const activeKey = dateKey(activeDate);
  const day = entries[activeKey] || emptyDay();

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("health-data", false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setData({
            entries: parsed.entries || {},
            allergies: parsed.allergies || [],
            profile: parsed.profile || EMPTY_PROFILE,
            checkedItems: parsed.checkedItems || {},
            weightLog: parsed.weightLog || {},
            reminders: parsed.reminders || EMPTY_REMINDERS,
            blockedRecipes: parsed.blockedRecipes || [],
          });
        }
      } catch (e) {
        // no existing data yet
      }
      try {
        const res2 = await window.storage.get("community-recipes", true);
        if (res2 && res2.value) setCommunity(JSON.parse(res2.value));
      } catch (e) {
        // no community recipes yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setData(next);
    try {
      const res = await window.storage.set("health-data", JSON.stringify(next), false);
      if (!res) setError("Saving failed. Please try again.");
      else setError(null);
    } catch (e) {
      setError("Saving failed. Please try again.");
    }
  }, []);

  const persistCommunity = useCallback(async (next) => {
    setCommunity(next);
    try {
      const res = await window.storage.set("community-recipes", JSON.stringify(next), true);
      if (!res) setFormError("Saving failed. Please try again.");
    } catch (e) {
      setFormError("Saving failed. Please try again.");
    }
  }, []);

  function updateDomain(key, delta, step) {
    const current = day[key] || 0;
    const next = Math.max(0, Math.round((current + delta) * 10) / 10);
    const nextLastLogged = { ...(day.lastLogged || {}), [key]: new Date().toISOString() };
    const nextDay = { ...day, [key]: next, lastLogged: nextLastLogged };
    persist({ ...data, entries: { ...entries, [activeKey]: nextDay } });
  }

  function showUndo(label, revert) {
    setUndo({ label, revert });
  }

  function toggleMeal(mealId, slotLabel) {
    const currentMeals = day.meals || { breakfast: false, snack1: false, lunch: false, snack2: false, dinner: false };
    const wasEaten = !!currentMeals[mealId];
    const nextMeals = { ...currentMeals, [mealId]: !wasEaten };
    const nextDay = { ...day, meals: nextMeals };
    persist({ ...data, entries: { ...entries, [activeKey]: nextDay } });
    if (slotLabel) showUndo(`${slotLabel} ${wasEaten ? "unmarked" : "marked eaten"}`, () => toggleMeal(mealId));
  }

  function toggleAllergen(id) {
    const next = allergies.includes(id) ? allergies.filter((a) => a !== id) : [...allergies, id];
    persist({ ...data, allergies: next });
  }

  function updateProfile(field, value) {
    let nextProfile = { ...profile, [field]: value };
    let nextWeightLog = weightLog;
    if (field === "weightKg" && !profile.startWeightKg && value) {
      nextProfile.startWeightKg = value;
      // Seed the tracker with this as day one, so the graph has a starting point.
      if (!weightLog[activeKey]) nextWeightLog = { ...weightLog, [activeKey]: parseFloat(value) };
    }
    persist({ ...data, profile: nextProfile, weightLog: nextWeightLog });
  }

  function selectRecipe(slotId, selection) {
    const nextSelections = { ...(day.selections || {}), [slotId]: selection };
    const nextDay = { ...day, selections: nextSelections };
    persist({ ...data, entries: { ...entries, [activeKey]: nextDay } });
    setPickerOpenFor(null);
  }

  function clearSelection(slotId) {
    const nextSelections = { ...(day.selections || {}) };
    delete nextSelections[slotId];
    const nextDay = { ...day, selections: nextSelections };
    persist({ ...data, entries: { ...entries, [activeKey]: nextDay } });
  }

  function addActivity(presetMinutes) {
    const activity = ACTIVITIES.find((a) => a.id === activityPick);
    const minutes = Math.max(1, parseInt(presetMinutes !== undefined ? presetMinutes : activityMinutesInput, 10) || 0);
    const kcal = Math.round(activity.met * weightKg * (minutes / 60));
    const entry = { id: `act-${Date.now()}`, activityId: activity.id, label: activity.label, minutes, kcal };
    const nextActivities = [...(day.activities || []), entry];
    const nextLastLogged = { ...(day.lastLogged || {}), move: new Date().toISOString() };
    const nextDay = { ...day, activities: nextActivities, lastLogged: nextLastLogged };
    persist({ ...data, entries: { ...entries, [activeKey]: nextDay } });
  }

  function removeActivity(id) {
    const removed = (day.activities || []).find((a) => a.id === id);
    const nextActivities = (day.activities || []).filter((a) => a.id !== id);
    const nextDay = { ...day, activities: nextActivities };
    persist({ ...data, entries: { ...entries, [activeKey]: nextDay } });
    if (removed) {
      showUndo(`Removed ${removed.label}`, () => {
        persist({ ...data, entries: { ...entries, [activeKey]: { ...nextDay, activities: [...nextActivities, removed] } } });
      });
    }
  }

  function logWeight() {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) return;
    const nextLog = { ...weightLog, [activeKey]: w };
    const nextProfile = { ...profile, weightKg: String(w) };
    if (!profile.startWeightKg) nextProfile.startWeightKg = String(w);
    persist({ ...data, weightLog: nextLog, profile: nextProfile });
    setWeightInput("");
  }

  function addMindEntry() {
    const option = MIND_OPTIONS.find((m) => m.id === mindPick);
    const entry = { id: `mind-${Date.now()}`, type: option.id, label: option.label, kcal: option.kcal, note: option.hasNote ? mindNote.trim() : "" };
    const nextLog = [...(day.mindLog || []), entry];
    const nextDay = { ...day, mindLog: nextLog };
    persist({ ...data, entries: { ...entries, [activeKey]: nextDay } });
    setMindNote("");
  }

  function removeMindEntry(id) {
    const removed = (day.mindLog || []).find((m) => m.id === id);
    const nextLog = (day.mindLog || []).filter((m) => m.id !== id);
    const nextDay = { ...day, mindLog: nextLog };
    persist({ ...data, entries: { ...entries, [activeKey]: nextDay } });
    if (removed) {
      showUndo(`Removed ${removed.label}`, () => {
        persist({ ...data, entries: { ...entries, [activeKey]: { ...nextDay, mindLog: [...nextLog, removed] } } });
      });
    }
  }

  function updateReminders(field, value) {
    persist({ ...data, reminders: { ...reminders, [field]: value } });
  }

  function toggleBlockRecipe(source, recipe) {
    const key = recipeKey(source, recipe);
    const next = blockedRecipes.includes(key) ? blockedRecipes.filter((k) => k !== key) : [...blockedRecipes, key];
    persist({ ...data, blockedRecipes: next });
    setPickerOpenFor(null);
  }

  function unblockKey(key) {
    persist({ ...data, blockedRecipes: blockedRecipes.filter((k) => k !== key) });
  }

  useEffect(() => {
    if (!reminders.enabled) {
      setNextWaterAt(null);
      setNextFoodAt(null);
      return;
    }
    const waterMs = Math.max(5, parseInt(reminders.waterMinutes, 10) || 60) * 60 * 1000;
    const foodMs = Math.max(5, parseInt(reminders.foodMinutes, 10) || 180) * 60 * 1000;
    setNextWaterAt(Date.now() + waterMs);
    setNextFoodAt(Date.now() + foodMs);
  }, [reminders.enabled, reminders.waterMinutes, reminders.foodMinutes]);

  useEffect(() => {
    if (!reminders.enabled) return;
    const waterMs = Math.max(5, parseInt(reminders.waterMinutes, 10) || 60) * 60 * 1000;
    const foodMs = Math.max(5, parseInt(reminders.foodMinutes, 10) || 180) * 60 * 1000;
    const tick = setInterval(() => {
      const now = Date.now();
      if (nextWaterAt && now >= nextWaterAt) {
        setToast({ message: "💧 Time for a glass of water!", kind: "water" });
        sendBrowserNotification("💧 Time for a glass of water!", "Tap to open Health Trail and log it.", "water");
        setNextWaterAt(now + waterMs);
      } else if (nextFoodAt && now >= nextFoodAt) {
        setToast({ message: "🍎 Time to check in on a meal or snack!", kind: "food" });
        sendBrowserNotification("🍎 Time to check in on a meal or snack!", "Tap to open Health Trail and log it.", "food");
        setNextFoodAt(now + foodMs);
      }
      forceTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(tick);
  }, [reminders.enabled, reminders.waterMinutes, reminders.foodMinutes, nextWaterAt, nextFoodAt]);

  function snoozeToast(minutes) {
    if (!toast) return;
    const until = Date.now() + minutes * 60000;
    if (toast.kind === "water") setNextWaterAt(until);
    else if (toast.kind === "food") setNextFoodAt(until);
    setToast(null);
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 15000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  function submitRecipe() {
    const name = form.name.trim();
    const ingredients = form.ingredients.split("\n").map((s) => s.trim()).filter(Boolean);
    const steps = form.steps.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!name) return setFormError("Give your recipe a name.");
    if (ingredients.length === 0) return setFormError("Add at least one ingredient.");
    if (steps.length === 0) return setFormError("Add at least one preparation step.");
    const newRecipe = {
      id: `community-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      slotCategory: form.category,
      name,
      allergens: form.allergens,
      ingredients,
      steps,
      totals: {
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.carbs) || 0,
        fat: parseFloat(form.fat) || 0,
        kcal: parseFloat(form.kcal) || 0,
      },
      authorName: form.authorName.trim() || "Anonymous",
    };
    persistCommunity([...community, newRecipe]);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowAddForm(false);
  }

  const frac = completion(day);
  const streak = currentStreak(entries, today);
  const isToday = offset === 0;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(activeDate);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const bmi = profile.weightKg && profile.heightCm ? parseFloat(profile.weightKg) / Math.pow(parseFloat(profile.heightCm) / 100, 2) : null;
  const maintenance = maintenanceEstimateFor(profile, weightKg);
  const weeklyRateKg = parseFloat(profile.weeklyRateKg) || 0.5;
  const deficit = weeklyRateKg * 1100;
  const exerciseAllowance = Math.round(rollingActivityAllowance(entries, activeDate));
  const rawDailyTarget = isWeightLossGoal ? Math.round(maintenance.value - deficit) : null;
  const dailyTarget = rawDailyTarget !== null ? Math.max(rawDailyTarget, SAFE_MIN_KCAL) + exerciseAllowance : null;
  const targetWasClamped = rawDailyTarget !== null && rawDailyTarget < SAFE_MIN_KCAL;
  const kgToGo = isWeightLossGoal && profile.weightKg && profile.targetWeightKg ? round1(parseFloat(profile.weightKg) - parseFloat(profile.targetWeightKg)) : null;
  const weeksToGoal = kgToGo && kgToGo > 0 ? Math.ceil(kgToGo / weeklyRateKg) : null;
  // Available for any goal — weight-loss uses the deficit target, the other
  // two goals use the maintenance estimate as a neutral daily reference.
  const effectiveDailyTarget = isWeightLossGoal ? dailyTarget : profile.goal ? Math.round(maintenance.value) + exerciseAllowance : null;
  const scalingActive = !!(profile.scaleRecipes && effectiveDailyTarget);

  const slotData = MEAL_SLOTS.map((slot) => {
    const { recipe, isFallback, isManual } = resolveRecipeForSlot(slot, activeDate, allergies, day, community, blockedRecipes);
    const baseTotals = recipeTotals(recipe);
    const targetSlotKcal = effectiveDailyTarget ? effectiveDailyTarget * SLOT_KCAL_SHARE[slot.id] : null;
    const rawMultiplier = scalingActive && targetSlotKcal && baseTotals.kcal > 0 ? targetSlotKcal / baseTotals.kcal : 1;
    const multiplier = Math.min(2, Math.max(0.5, rawMultiplier));
    const totals = { protein: round1(baseTotals.protein * multiplier), carbs: round1(baseTotals.carbs * multiplier), fat: round1(baseTotals.fat * multiplier), kcal: Math.round(baseTotals.kcal * multiplier) };
    const eaten = !!(day.meals && day.meals[slot.id]);
    return { slot, recipe, isFallback, isManual, totals, multiplier, eaten };
  });

  const dayTotals = slotData
    .filter((s) => s.eaten)
    .reduce(
      (acc, s) => ({
        protein: acc.protein + s.totals.protein,
        carbs: acc.carbs + s.totals.carbs,
        fat: acc.fat + s.totals.fat,
        kcal: acc.kcal + s.totals.kcal,
      }),
      { protein: 0, carbs: 0, fat: 0, kcal: 0 }
    );

  const chartData = [
    { name: "Protein", grams: round1(dayTotals.protein), value: Math.round(dayTotals.protein * 4), color: "#2F6E63" },
    { name: "Carbs", grams: round1(dayTotals.carbs), value: Math.round(dayTotals.carbs * 4), color: "#E3A73E" },
    { name: "Fat", grams: round1(dayTotals.fat), value: Math.round(dayTotals.fat * 9), color: "#FF5A3C" },
  ].filter((c) => c.value > 0);

  const shoppingList = (() => {
    const counts = {};
    for (let i = 0; i < shoppingRange; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayObj = entries[dateKey(d)] || emptyDay();
      MEAL_SLOTS.forEach((slot) => {
        const { recipe } = resolveRecipeForSlot(slot, d, allergies, dayObj, community, blockedRecipes);
        recipe.ingredients.forEach((ing) => {
          const text = typeof ing === "string" ? ing : ing.name;
          counts[text] = (counts[text] || 0) + 1;
        });
      });
    }
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).map(([text, count]) => ({ text, count }));
  })();
  const shoppingText = shoppingList.map((i) => `- ${i.text}${i.count > 1 ? ` (x${i.count})` : ""}`).join("\n");

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>
      {loaded && !profile.onboardingComplete && (
        <Onboarding onComplete={() => updateProfile("onboardingComplete", true)} />
      )}
      <div className="min-h-screen" style={{ background: "#EAF2F0", color: "#15241F" }}>
        <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12 pb-24">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="font-mono text-xs tracking-wide" style={{ color: "#2F6E63" }}>DAILY TRAIL</p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-1 flex items-center gap-2">
                {isToday ? "Today" : fmtDay(activeDate)}
                {streak > 1 && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: "#E3A73E", color: "#FFFFFF" }}>🔥 {streak}d</span>
                )}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <button aria-label="Preferences" onClick={() => setSettingsOpen(true)} className="p-2 rounded-full hover:bg-white transition-colors focus-visible:outline focus-visible:outline-2" style={{ outlineColor: "#2F6E63" }}>
                <Settings2 size={18} />
              </button>
              <button aria-label="Previous day" onClick={() => setOffset((o) => o - 1)} className="p-2 rounded-full hover:bg-white transition-colors focus-visible:outline focus-visible:outline-2" style={{ outlineColor: "#2F6E63" }}>
                <ChevronLeft size={18} />
              </button>
              <button aria-label="Next day" onClick={() => setOffset((o) => Math.min(60, o + 1))} disabled={offset >= 60} className="p-2 rounded-full hover:bg-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2" style={{ outlineColor: "#2F6E63" }}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          {offset > 0 && (
            <p className="text-xs -mt-6 mb-6" style={{ color: "#4A5D57" }}>Planning ahead — nothing logged for this day yet.</p>
          )}
          {isToday && (() => {
            const suggestion = nextSuggestion(day);
            if (!suggestion) {
              return (
                <div className="rounded-xl p-4 mb-6 flex items-center gap-2" style={{ background: "#2F6E63", color: "#FFFFFF" }}>
                  <Check size={16} /> <span className="text-sm font-medium">Everything's logged for today. Nice work.</span>
                </div>
              );
            }
            const action = () => {
              if (suggestion.type === "water") updateDomain("water", 1);
              else if (suggestion.type === "meal") toggleMeal(suggestion.slotId, MEAL_SLOTS.find((s) => s.id === suggestion.slotId)?.label);
              else if (suggestion.type === "move") setLogActivityOpen(true);
              else if (suggestion.type === "mind") setLogMindOpen(true);
            };
            return (
              <div className="rounded-xl p-4 mb-6 flex items-center justify-between gap-3" style={{ background: "#FFFFFF", border: "2px solid #FF5A3C" }}>
                <div>
                  <p className="font-mono text-[10px] mb-0.5" style={{ color: "#4A5D57" }}>NEXT UP</p>
                  <p className="text-sm font-medium">{suggestion.text}</p>
                </div>
                {suggestion.type !== "sleep" && (
                  <button onClick={action} className="text-sm font-medium px-4 py-2 rounded-lg shrink-0 focus-visible:outline focus-visible:outline-2" style={{ background: "#FF5A3C", color: "#FFFFFF" }}>
                    Do it
                  </button>
                )}
              </div>
            );
          })()}

          {/* Preferences & profile panel */}
          {settingsOpen && (
            <div className="rounded-xl p-4 mb-6" style={{ background: "#FFFFFF", border: "1px solid #D3E0DB" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-xs" style={{ color: "#4A5D57" }}>ALLERGIES / PREFERENCES</p>
                <button aria-label="Close" onClick={() => setSettingsOpen(false)} className="p-1">
                  <X size={16} color="#4A5D57" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {ALLERGENS.map((a) => {
                  const active = allergies.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => toggleAllergen(a.id)} className="text-xs px-3 py-1.5 rounded-full transition-colors focus-visible:outline focus-visible:outline-2" style={{ background: active ? "#2F6E63" : "#EAF2F0", color: active ? "#FFFFFF" : "#15241F", border: "1px solid " + (active ? "#2F6E63" : "#D3E0DB") }}>
                      {a.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mb-4" style={{ color: "#4A5D57" }}>Recipes containing these are skipped when the schedule is built automatically. Use "Choose a different recipe" on any meal to see alternatives.</p>

              {blockedRecipes.length > 0 && (
                <>
                  <p className="font-mono text-xs mb-2" style={{ color: "#4A5D57" }}>BLOCKED RECIPES</p>
                  <div className="flex flex-col gap-1 mb-4">
                    {blockedRecipes.map((key) => (
                      <div key={key} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md" style={{ background: "#EAF2F0" }}>
                        <span>{blockedRecipeLabel(key, community)}</span>
                        <button onClick={() => unblockKey(key)} className="font-medium" style={{ color: "#2F6E63" }}>Unblock</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <p className="font-mono text-xs mb-3" style={{ color: "#4A5D57" }}>YOUR PROFILE</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="text-xs block mb-1">Name</label>
                  <input value={profile.name} onChange={(e) => updateProfile("name", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} placeholder="Optional" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs block mb-1">Goal</label>
                  <select value={profile.goal} onChange={(e) => updateProfile("goal", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }}>
                    <option value="">Not set</option>
                    {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1">Sex</label>
                  <select value={profile.sex} onChange={(e) => updateProfile("sex", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }}>
                    <option value="">Not set</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1">Age</label>
                  <input type="number" value={profile.age} onChange={(e) => updateProfile("age", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} />
                </div>
                <div>
                  <label className="text-xs block mb-1">Weight (kg)</label>
                  <input type="number" value={profile.weightKg} onChange={(e) => updateProfile("weightKg", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} placeholder={`Default ${DEFAULT_WEIGHT_KG}`} />
                </div>
                <div>
                  <label className="text-xs block mb-1">Height (cm)</label>
                  <input type="number" value={profile.heightCm} onChange={(e) => updateProfile("heightCm", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} />
                </div>
                <div>
                  <label className="text-xs block mb-1">Body fat % (optional)</label>
                  <input type="number" value={profile.bodyFatPct} onChange={(e) => updateProfile("bodyFatPct", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs block mb-1">Job / lifestyle activity</label>
                  <select value={profile.lifestyleActivity} onChange={(e) => updateProfile("lifestyleActivity", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }}>
                    {ACTIVITY_LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                  <p className="text-[11px] mt-1" style={{ color: "#4A5D57" }}>This is your day-to-day baseline (e.g. an office job vs. construction or hospitality) — separate from workouts you log under Move.</p>
                </div>
                {isWeightLossGoal && (
                  <div>
                    <label className="text-xs block mb-1">Target weight (kg)</label>
                    <input type="number" value={profile.targetWeightKg} onChange={(e) => updateProfile("targetWeightKg", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} />
                  </div>
                )}
                {isWeightLossGoal && (
                  <div>
                    <label className="text-xs block mb-1">Weekly pace</label>
                    <select value={profile.weeklyRateKg} onChange={(e) => updateProfile("weeklyRateKg", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }}>
                      {RATE_OPTIONS.map((r) => <option key={r} value={r}>{r} kg/week</option>)}
                    </select>
                  </div>
                )}
              </div>
              {kgToGo !== null && (
                <p className="text-xs mb-1" style={{ color: "#4A5D57" }}>
                  {kgToGo > 0 ? <span><span className="font-mono" style={{ color: "#15241F" }}>{kgToGo} kg</span> to go — about <span className="font-mono" style={{ color: "#15241F" }}>{weeksToGoal} weeks</span> at this pace.</span> : "You've reached your target weight."}
                </p>
              )}
              {dailyTarget && (
                <p className="text-xs mb-1" style={{ color: "#4A5D57" }}>
                  Rough daily calorie target: <span className="font-mono" style={{ color: "#15241F" }}>~{dailyTarget} kcal</span> ({maintenance.precise ? "estimated with the Mifflin-St Jeor formula from your age, sex, weight and height" : "estimated from your weight only — add your sex, age and height for a more accurate figure"}, assuming light daily activity{exerciseAllowance > 0 ? ` plus a ${exerciseAllowance} kcal/day exercise allowance` : ""}. Not personalized medical advice — check with a professional for a precise target).
                </p>
              )}
              {exerciseAllowance > 0 && (
                <p className="text-xs mb-1" style={{ color: "#4A5D57" }}>
                  The exercise allowance is a 7-day rolling average of your logged activity — so a few kickboxing sessions a week nudge your daily budget up gradually, not just on the exact day you train. It fills in as you log more days.
                </p>
              )}
              {targetWasClamped && (
                <p className="text-xs mb-1" style={{ color: "#FF5A3C" }}>
                  That pace would push your target below a safe minimum, so it's been capped at {SAFE_MIN_KCAL} kcal. Consider a slower weekly pace.
                </p>
              )}
              {effectiveDailyTarget && (
                <button onClick={() => updateProfile("scaleRecipes", !profile.scaleRecipes)} className="text-xs font-medium px-3 py-1.5 rounded-full mt-1 mb-1" style={{ background: profile.scaleRecipes ? "#2F6E63" : "#EAF2F0", color: profile.scaleRecipes ? "#FFFFFF" : "#15241F" }}>
                  {profile.scaleRecipes ? "✓ Scaling recipes to ~" + effectiveDailyTarget + " kcal/day" : "Scale recipe portions to fit ~" + effectiveDailyTarget + " kcal/day"}
                </button>
              )}
              {bmi && (
                <p className="text-xs" style={{ color: "#4A5D57" }}>
                  BMI: <span className="font-mono" style={{ color: "#15241F" }}>{round1(bmi)}</span> — {bmiCategory(bmi)}
                </p>
              )}
              {!profile.weightKg && (
                <p className="text-xs mt-1" style={{ color: "#4A5D57" }}>No weight set — activity calorie estimates use a default of {DEFAULT_WEIGHT_KG} kg.</p>
              )}

              <p className="font-mono text-xs mb-3 mt-4" style={{ color: "#4A5D57" }}>REMINDERS</p>
              <p className="text-xs mb-3" style={{ color: "#4A5D57" }}>
                Always shown as an in-app banner. If you grant notification permission below, they'll also
                appear as a real browser notification while the app is installed/running in the background.
              </p>
              {notifPermission !== "unsupported" && notifPermission !== "granted" && (
                <button
                  onClick={async () => {
                    const { granted } = await requestNotificationPermission();
                    setNotifPermission(granted ? "granted" : "denied");
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full mb-3"
                  style={{ background: "#EAF2F0", color: "#15241F" }}
                >
                  Enable browser notifications
                </button>
              )}
              {notifPermission === "granted" && (
                <p className="text-xs mb-3" style={{ color: "#2F6E63" }}>✓ Browser notifications enabled</p>
              )}
              <button onClick={() => updateReminders("enabled", !reminders.enabled)} className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 mb-3" style={{ background: reminders.enabled ? "#2F6E63" : "#EAF2F0", color: reminders.enabled ? "#FFFFFF" : "#15241F" }}>
                {reminders.enabled ? <Bell size={13} /> : <BellOff size={13} />} {reminders.enabled ? "Reminders on" : "Reminders off"}
              </button>
              {reminders.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs block mb-1">Water every (min)</label>
                    <input type="number" value={reminders.waterMinutes} onChange={(e) => updateReminders("waterMinutes", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">Food every (min)</label>
                    <input type="number" value={reminders.foodMinutes} onChange={(e) => updateReminders("foodMinutes", e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {toast && (
            <div className="rounded-xl p-3 mb-3" style={{ background: "#2F6E63", color: "#FFFFFF" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{toast.message}</span>
                <button aria-label="Dismiss" onClick={() => setToast(null)}><X size={16} /></button>
              </div>
              <div className="flex gap-2">
                {[5, 15, 30].map((m) => (
                  <button key={m} onClick={() => snoozeToast(m)} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#FFFFFF" }}>Snooze {m}m</button>
                ))}
              </div>
            </div>
          )}

          {undo && (
            <div className="rounded-xl p-3 mb-6 flex items-center justify-between" style={{ background: "#15241F", color: "#FFFFFF" }}>
              <span className="text-sm">{undo.label}</span>
              <button onClick={() => { undo.revert(); setUndo(null); }} className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: "#FF5A3C", color: "#FFFFFF" }}>Undo</button>
            </div>
          )}

          {/* Signature trail element */}
          <div className="rounded-2xl p-5 sm:p-6 mb-6" style={{ background: "#FFFFFF" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs" style={{ color: "#4A5D57" }}>PROGRESS</span>
              <span className="font-display text-lg font-semibold" style={{ color: "#FF5A3C" }}>{Math.round(frac * 100)}%</span>
            </div>
            <svg viewBox="0 0 520 110" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
              <path d={TRAIL_PATH} fill="none" stroke="#D3E0DB" strokeWidth="6" strokeLinecap="round" />
              <path d={TRAIL_PATH} fill="none" stroke="#FF5A3C" strokeWidth="6" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset={1000 - frac * 1000} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              {CHECKPOINTS.map((cp, i) => {
                const domain = DOMAINS[i];
                const Icon = domain.icon;
                const done = getValue(day, domain.key) >= domain.goal;
                return (
                  <g key={domain.key} transform={`translate(${cp.x}, ${cp.y})`}>
                    <circle r="16" fill={done ? "#2F6E63" : "#FFFFFF"} stroke="#2F6E63" strokeWidth="2" />
                    <foreignObject x="-9" y="-9" width="18" height="18">
                      <Icon size={18} color={done ? "#FFFFFF" : "#2F6E63"} />
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Move / activity card */}
          <div className="rounded-xl p-4 mb-3" style={{ background: "#FFFFFF" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Footprints size={16} color="#2F6E63" />
                <span className="text-sm font-medium">Move</span>
                {activityMinutes(day) >= 30 && <Check size={14} color="#FF5A3C" />}
              </div>
              <button onClick={() => setLogActivityOpen((s) => !s)} className="text-xs font-medium flex items-center gap-1" style={{ color: "#2F6E63" }}>
                <Plus size={13} /> Log activity
              </button>
            </div>
            <p className="font-mono text-sm mb-1">
              {activityMinutes(day)}<span style={{ color: "#4A5D57" }}> / 30 min</span>
              {activityKcal(day) > 0 && (
                <span style={{ color: "#4A5D57" }}> · <Flame size={11} style={{ display: "inline", verticalAlign: "-1px" }} color="#FF5A3C" /> {Math.round(activityKcal(day))} kcal</span>
              )}
              {isToday && day.lastLogged?.move && (
                <span style={{ color: "#4A5D57" }}> · last logged {timeSince(day.lastLogged.move)}</span>
              )}
            </p>
            {(day.activities || []).length > 0 && (
              <div className="flex flex-col gap-1 mt-2">
                {(day.activities || []).map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md" style={{ background: "#EAF2F0" }}>
                    <span>{a.label} · {a.minutes} min</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono" style={{ color: "#4A5D57" }}>{a.kcal} kcal</span>
                      <button aria-label="Remove" onClick={() => removeActivity(a.id)}><Trash2 size={12} color="#4A5D57" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {logActivityOpen && (
              <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid #EAF2F0" }}>
                <select value={activityPick} onChange={(e) => setActivityPick(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg" style={{ border: "1px solid #D3E0DB" }}>
                  {ACTIVITIES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
                <div className="flex gap-2 flex-wrap">
                  {[15, 30, 45, 60].map((m) => (
                    <button key={m} onClick={() => addActivity(m)} className="text-xs px-3 py-1.5 rounded-full" style={{ background: activityMinutesInput === m ? "#2F6E63" : "#EAF2F0", color: activityMinutesInput === m ? "#FFFFFF" : "#15241F" }}>{m} min</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="number" value={activityMinutesInput} onChange={(e) => setActivityMinutesInput(e.target.value)} className="w-20 text-sm px-2 py-1.5 rounded-lg" style={{ border: "1px solid #D3E0DB" }} placeholder="Custom" />
                  <button onClick={() => addActivity()} className="text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: "#2F6E63", color: "#FFFFFF" }}>Add custom</button>
                </div>
                <p className="text-[11px]" style={{ color: "#4A5D57" }}>
                  Estimated using {ACTIVITIES.find((a) => a.id === activityPick)?.met} MET and {profile.weightKg ? `your weight (${profile.weightKg} kg)` : `a default weight of ${DEFAULT_WEIGHT_KG} kg — set yours in Preferences for accuracy`}. Tap a preset above to log instantly.
                </p>
              </div>
            )}
          </div>

          {/* Domain cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {DOMAINS.filter((d) => d.key !== "move").map((d) => {
              const Icon = d.icon;
              const value = getValue(day, d.key);
              const met = value >= d.goal;
              const isFuel = d.key === "fuel";
              return (
                <div key={d.key} className={d.key === "sleep" ? "rounded-xl p-4 col-span-2" : "rounded-xl p-4"} style={{ background: "#FFFFFF" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={16} color="#2F6E63" />
                    <span className="text-sm font-medium">{d.label}</span>
                    {met && <Check size={14} color="#FF5A3C" className="ml-auto" />}
                  </div>
                  {isFuel ? (
                    <div>
                      <span className="font-mono text-sm">{value}<span style={{ color: "#4A5D57" }}> / {d.goal} {d.unit}</span></span>
                      <p className="text-xs mt-2" style={{ color: "#4A5D57" }}>Check off items in the nutrition schedule below</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <button aria-label={`Decrease ${d.label}`} onClick={() => updateDomain(d.key, -d.step)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 focus-visible:outline focus-visible:outline-2" style={{ border: "1px solid #D3E0DB" }}>
                          <Minus size={14} />
                        </button>
                        <span className="font-mono text-sm">{value}<span style={{ color: "#4A5D57" }}> / {d.goal} {d.unit}</span></span>
                        <button aria-label={`Increase ${d.label}`} onClick={() => updateDomain(d.key, d.step)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 focus-visible:outline focus-visible:outline-2" style={{ border: "1px solid #D3E0DB" }}>
                          <Plus size={14} />
                        </button>
                      </div>
                      {isToday && day.lastLogged?.[d.key] && (
                        <p className="text-[11px] mt-1.5 text-center" style={{ color: "#4A5D57" }}>last logged {timeSince(day.lastLogged[d.key])}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Self-care log */}
          <div className="rounded-xl p-4 mb-6" style={{ background: "#FFFFFF" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sparkle size={16} color="#E3A73E" />
                <span className="text-sm font-medium">Self-care</span>
                {(day.mindLog || []).length > 0 && <Check size={14} color="#FF5A3C" />}
              </div>
              <button onClick={() => setLogMindOpen((s) => !s)} className="text-xs font-medium flex items-center gap-1" style={{ color: "#2F6E63" }}>
                <Plus size={13} /> Log a moment
              </button>
            </div>
            {(day.mindLog || []).length > 0 ? (
              <div className="flex flex-col gap-1 mt-2">
                {(day.mindLog || []).map((m) => {
                  const option = MIND_OPTIONS.find((o) => o.id === m.type);
                  const Icon = option ? option.icon : Sparkle;
                  return (
                    <div key={m.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md" style={{ background: "#EAF2F0" }}>
                      <span className="flex items-center gap-1.5">
                        <Icon size={12} color="#2F6E63" />
                        {m.label}{m.note ? ` — "${m.note}"` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        {m.kcal > 0 && <span className="font-mono" style={{ color: "#4A5D57" }}>{m.kcal} kcal</span>}
                        <button aria-label="Remove" onClick={() => removeMindEntry(m.id)}><Trash2 size={12} color="#4A5D57" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs mt-2" style={{ color: "#4A5D57" }}>Nothing logged yet today.</p>
            )}
            {logMindOpen && (
              <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid #EAF2F0" }}>
                <select value={mindPick} onChange={(e) => setMindPick(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg" style={{ border: "1px solid #D3E0DB" }}>
                  {MIND_OPTIONS.map((m) => <option key={m.id} value={m.id}>{m.label}{m.kcal > 0 ? ` (${m.kcal} kcal)` : ""}</option>)}
                </select>
                {MIND_OPTIONS.find((m) => m.id === mindPick)?.hasNote && (
                  <input value={mindNote} onChange={(e) => setMindNote(e.target.value)} className="text-sm px-2 py-1.5 rounded-lg" style={{ border: "1px solid #D3E0DB" }} placeholder="Add a short note (optional)" />
                )}
                <button onClick={addMindEntry} className="text-sm font-medium px-3 py-1.5 rounded-lg self-start" style={{ background: "#2F6E63", color: "#FFFFFF" }}>Add</button>
              </div>
            )}
          </div>

          {/* Nutrition schedule */}
          <div className="rounded-xl p-4 mb-6" style={{ background: "#FFFFFF" }}>
            <div className="flex items-center gap-2 mb-1">
              <Beef size={16} color="#2F6E63" />
              <p className="font-mono text-xs" style={{ color: "#4A5D57" }}>NUTRITION SCHEDULE · HIGH PROTEIN</p>
            </div>
            <p className="text-[11px] mb-3" style={{ color: "#4A5D57" }}>Legend: P = protein, C = carbs, F = fat, kcal = calories</p>
            <div className="flex flex-col gap-2">
              {slotData.map(({ slot, recipe, isFallback, isManual, totals, multiplier, eaten }) => {
                const isOpen = openRecipe === slot.id;
                const options = communityForSlot(slot, community);
                return (
                  <div key={slot.id} className="rounded-lg" style={{ border: "1px solid #D3E0DB" }}>
                    <div className="flex items-center gap-3 p-3">
                      <button aria-label={`${slot.label} eaten`} onClick={() => toggleMeal(slot.id, slot.label)} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 focus-visible:outline focus-visible:outline-2" style={{ background: eaten ? "#2F6E63" : "#FFFFFF", border: "1px solid #2F6E63" }}>
                        {eaten && <Check size={13} color="#FFFFFF" />}
                      </button>
                      <button className="flex-1 text-left" onClick={() => setOpenRecipe(isOpen ? null : slot.id)}>
                        <p className="text-xs font-mono" style={{ color: "#2F6E63" }}>{slot.label}</p>
                        <p className="text-sm font-medium">
                          {recipe.name}
                          {recipe.authorName && <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-2" style={{ background: "#EAF2F0", color: "#2F6E63" }}>Community · {recipe.authorName}</span>}
                          {isWeightLossGoal && isLight(recipe, slot) && <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-2" style={{ background: "#E3A73E", color: "#FFFFFF" }}>Lighter option</span>}
                          {multiplier !== 1 && <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-2" style={{ background: "#D3E0DB", color: "#15241F" }}>Scaled ×{round1(multiplier)}</span>}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#4A5D57" }}>{Math.round(totals.protein)}g protein · {Math.round(totals.kcal)} kcal</p>
                        {isFallback && <p className="text-xs mt-1" style={{ color: "#FF5A3C" }}>No match without your selected allergies today — showing the default option</p>}
                      </button>
                      <button aria-label={isOpen ? "Collapse recipe" : "Expand recipe"} onClick={() => setOpenRecipe(isOpen ? null : slot.id)} className="p-1 shrink-0" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}>
                        <ChevronDown size={16} color="#4A5D57" />
                      </button>
                    </div>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-0 text-sm" style={{ borderTop: "1px solid #EAF2F0" }}>
                        {recipe.allergens.length > 0 && (
                          <p className="text-xs mt-3 mb-2" style={{ color: "#4A5D57" }}>
                            Contains: {recipe.allergens.map((a) => ALLERGENS.find((x) => x.id === a)?.label || a).join(", ")}
                          </p>
                        )}
                        {multiplier !== 1 && (
                          <p className="text-xs mt-2 mb-2" style={{ color: "#4A5D57" }}>
                            Quantities below are scaled ×{round1(multiplier)} from the original recipe to fit this slot's share of your daily calorie target — treat them as approximate, not exact shopping amounts.
                          </p>
                        )}
                        <p className="font-medium text-xs mt-3 mb-1.5" style={{ color: "#2F6E63" }}>Ingredients{recipe.ingredients.length && typeof recipe.ingredients[0] === "object" ? " & nutrition" : ""}</p>
                        <div className="flex flex-col gap-1.5 mb-3">
                          {recipe.ingredients.map((ing, idx) =>
                            typeof ing === "string" ? (
                              <div key={idx} className="text-xs" style={{ color: "#15241F" }}>{scaleQuantityText(ing, multiplier)}</div>
                            ) : (
                              <div key={idx} className="flex items-center justify-between gap-2 text-xs" style={{ color: "#15241F" }}>
                                <span className="flex-1">{scaleQuantityText(ing.name, multiplier)}</span>
                                <span className="font-mono shrink-0" style={{ color: "#4A5D57" }}>{round1(ing.protein * multiplier)}g P · {round1(ing.carbs * multiplier)}g C · {round1(ing.fat * multiplier)}g F · {Math.round(ing.kcal * multiplier)} kcal</span>
                              </div>
                            )
                          )}
                          {recipe.totals && (
                            <p className="text-xs mt-0.5" style={{ color: "#4A5D57" }}>Nutrition was submitted as a recipe total, not per ingredient.</p>
                          )}
                          <div className="flex items-center justify-between gap-2 text-xs pt-1.5 mt-0.5" style={{ borderTop: "1px solid #EAF2F0", color: "#15241F" }}>
                            <span className="flex-1 font-medium">Total</span>
                            <span className="font-mono font-medium shrink-0" style={{ color: "#2F6E63" }}>{round1(totals.protein)}g P · {round1(totals.carbs)}g C · {round1(totals.fat)}g F · {Math.round(totals.kcal)} kcal</span>
                          </div>
                        </div>
                        <p className="font-medium text-xs mb-1.5" style={{ color: "#2F6E63" }}>Method</p>
                        <ol className="list-decimal pl-4" style={{ color: "#15241F" }}>
                          {recipe.steps.map((step, idx) => <li key={idx} className="mb-0.5">{step}</li>)}
                        </ol>

                        <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #EAF2F0" }}>
                          <button onClick={() => setPickerOpenFor(pickerOpenFor === slot.id ? null : slot.id)} className="text-xs font-medium" style={{ color: "#2F6E63" }}>
                            {pickerOpenFor === slot.id ? "Hide options" : "Choose a different recipe"}
                          </button>
                          <button onClick={() => toggleBlockRecipe(recipe.authorName ? "community" : "builtin", recipe)} className="text-xs font-medium flex items-center gap-1" style={{ color: "#4A5D57" }}>
                            <Ban size={12} /> Never show this recipe
                          </button>
                        </div>
                        {pickerOpenFor === slot.id && (
                            <div className="mt-2 flex flex-col gap-1">
                              {isManual && (
                                <button onClick={() => clearSelection(slot.id)} className="text-xs text-left px-2 py-1.5 rounded-md" style={{ background: "#EAF2F0" }}>↺ Go back to automatic rotation</button>
                              )}
                              {sortForGoal(slot.variants, isWeightLossGoal).map((v) => (
                                <div key={v.name} className="flex items-center gap-1">
                                  <button onClick={() => selectRecipe(slot.id, { source: "builtin", ref: v.name })} className="flex-1 text-xs text-left px-2 py-1.5 rounded-md hover:bg-gray-50 flex items-center justify-between gap-2" style={{ background: recipe.name === v.name ? "#EAF2F0" : "transparent" }}>
                                    <span>{v.name}</span>
                                    <span className="font-mono shrink-0" style={{ color: "#4A5D57" }}>{Math.round(recipeTotals(v).kcal)} kcal</span>
                                  </button>
                                  <button aria-label={`Block ${v.name}`} onClick={() => toggleBlockRecipe("builtin", v)} className="p-1.5 shrink-0" style={{ color: "#4A5D57" }}><Ban size={12} /></button>
                                </div>
                              ))}
                              {sortForGoal(options, isWeightLossGoal).map((r) => (
                                <div key={r.id} className="flex items-center gap-1">
                                  <button onClick={() => selectRecipe(slot.id, { source: "community", ref: r.id })} className="flex-1 text-xs text-left px-2 py-1.5 rounded-md hover:bg-gray-50 flex items-center gap-1.5" style={{ background: recipe.name === r.name ? "#EAF2F0" : "transparent" }}>
                                    <Users size={11} color="#2F6E63" /> {r.name} <span style={{ color: "#4A5D57" }}>· {r.authorName}</span>
                                  </button>
                                  <button aria-label={`Block ${r.name}`} onClick={() => toggleBlockRecipe("community", r)} className="p-1.5 shrink-0" style={{ color: "#4A5D57" }}><Ban size={12} /></button>
                                </div>
                              ))}
                              {options.length === 0 && <p className="text-xs" style={{ color: "#4A5D57" }}>No community recipes for this slot yet.</p>}
                            </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add recipe form */}
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid #D3E0DB" }}>
              <button onClick={() => setShowAddForm((s) => !s)} className="text-xs font-medium flex items-center gap-1" style={{ color: "#2F6E63" }}>
                <Plus size={14} /> {showAddForm ? "Close form" : "Add your own recipe"}
              </button>
              {showAddForm && (
                <div className="mt-3 flex flex-col gap-3">
                  <p className="text-xs" style={{ color: "#4A5D57" }}>Recipes you add here are visible to everyone using this planner.</p>
                  <div>
                    <label className="text-xs font-medium block mb-1">Name</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} placeholder="e.g. Protein overnight oats" />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Meal slot</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }}>
                      {Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Contains (optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {ALLERGENS.map((a) => {
                        const active = form.allergens.includes(a.id);
                        return (
                          <button key={a.id} type="button" onClick={() => setForm({ ...form, allergens: active ? form.allergens.filter((x) => x !== a.id) : [...form.allergens, a.id] })} className="text-xs px-2.5 py-1 rounded-full" style={{ background: active ? "#2F6E63" : "#EAF2F0", color: active ? "#FFFFFF" : "#15241F" }}>{a.label}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Ingredients (one per line)</label>
                    <textarea value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} rows={3} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} placeholder={"150 g quark\n1 banana"} />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Method (one step per line)</label>
                    <textarea value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} rows={3} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} placeholder={"Mix everything.\nServe cold."} />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div><label className="text-xs block mb-1">Protein (g)</label><input type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} className="w-full text-sm px-2 py-1.5 rounded-lg" style={{ border: "1px solid #D3E0DB" }} /></div>
                    <div><label className="text-xs block mb-1">Carbs (g)</label><input type="number" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} className="w-full text-sm px-2 py-1.5 rounded-lg" style={{ border: "1px solid #D3E0DB" }} /></div>
                    <div><label className="text-xs block mb-1">Fat (g)</label><input type="number" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} className="w-full text-sm px-2 py-1.5 rounded-lg" style={{ border: "1px solid #D3E0DB" }} /></div>
                    <div><label className="text-xs block mb-1">Kcal</label><input type="number" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} className="w-full text-sm px-2 py-1.5 rounded-lg" style={{ border: "1px solid #D3E0DB" }} /></div>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">Your name (optional)</label>
                    <input value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} className="w-full text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} placeholder="Anonymous" />
                  </div>
                  {formError && <p className="text-xs" style={{ color: "#FF5A3C" }}>{formError}</p>}
                  <button onClick={submitRecipe} className="text-sm font-medium px-4 py-2 rounded-lg focus-visible:outline focus-visible:outline-2" style={{ background: "#2F6E63", color: "#FFFFFF" }}>Add recipe to community</button>
                </div>
              )}
            </div>
          </div>

          {/* Daily intake chart */}
          <div className="rounded-xl p-4 mb-6" style={{ background: "#FFFFFF" }}>
            <p className="font-mono text-xs mb-1" style={{ color: "#4A5D57" }}>DAILY INTAKE</p>
            {chartData.length > 0 ? (
              <>
                <p className="font-display text-2xl font-semibold mb-1">{Math.round(dayTotals.kcal + mindKcal(day))} kcal</p>
                {mindKcal(day) > 0 && (
                  <p className="text-xs mb-1" style={{ color: "#4A5D57" }}>Includes {mindKcal(day)} kcal logged under self-care (e.g. wine).</p>
                )}
                {dailyTarget && (
                  <p className="text-xs mb-2" style={{ color: "#4A5D57" }}>
                    Goal: ~{dailyTarget} kcal/day — {Math.round(dayTotals.kcal + mindKcal(day)) <= dailyTarget ? `${Math.round(dailyTarget - dayTotals.kcal - mindKcal(day))} kcal remaining` : `${Math.round(dayTotals.kcal + mindKcal(day) - dailyTarget)} kcal over`}
                  </p>
                )}
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${props.payload.grams} g (${value} kcal)`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <p className="text-sm mt-2" style={{ color: "#4A5D57" }}>Check off meals in the nutrition schedule to see your daily intake here.</p>
            )}
          </div>

          {/* Weight tracker */}
          <div className="rounded-xl p-4 mb-6" style={{ background: "#FFFFFF" }}>
            <div className="flex items-center gap-2 mb-3">
              <Scale size={16} color="#2F6E63" />
              <p className="font-mono text-xs" style={{ color: "#4A5D57" }}>WEIGHT TRACKER</p>
            </div>
            <div className="flex gap-2 mb-3">
              <input type="number" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder={`Log weight for ${isToday ? "today" : fmtDay(activeDate)} (kg)`} className="flex-1 text-sm px-3 py-2 rounded-lg" style={{ border: "1px solid #D3E0DB" }} />
              <button onClick={logWeight} className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "#2F6E63", color: "#FFFFFF" }}>Log</button>
            </div>
            {profile.startWeightKg && (
              <p className="text-xs mb-2 flex items-center gap-2" style={{ color: "#4A5D57" }}>
                <span>
                  Start: <span className="font-mono" style={{ color: "#15241F" }}>{profile.startWeightKg} kg</span>
                  {profile.weightKg && profile.weightKg !== profile.startWeightKg && (
                    <> · Now: <span className="font-mono" style={{ color: "#15241F" }}>{profile.weightKg} kg</span> ({round1(parseFloat(profile.weightKg) - parseFloat(profile.startWeightKg)) > 0 ? "+" : ""}{round1(parseFloat(profile.weightKg) - parseFloat(profile.startWeightKg))} kg)</>
                  )}
                </span>
                <button onClick={() => updateProfile("startWeightKg", "")} className="underline shrink-0">reset</button>
              </p>
            )}
            {Object.keys(weightLog).length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={Object.entries(weightLog).sort((a, b) => a[0].localeCompare(b[0])).map(([d, w]) => ({ date: d.slice(5), weight: w }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAF2F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#4A5D57" />
                  <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11 }} stroke="#4A5D57" />
                  <Tooltip formatter={(value) => [`${value} kg`, "Weight"]} />
                  <Line type="monotone" dataKey="weight" stroke="#2F6E63" strokeWidth={2} dot={{ r: 3 }} />
                  {profile.startWeightKg && (
                    <ReferenceLine y={parseFloat(profile.startWeightKg)} stroke="#4A5D57" strokeDasharray="2 2" label={{ value: "Start", fontSize: 11, fill: "#4A5D57" }} />
                  )}
                  {isWeightLossGoal && profile.targetWeightKg && (
                    <ReferenceLine y={parseFloat(profile.targetWeightKg)} stroke="#FF5A3C" strokeDasharray="4 4" label={{ value: "Target", fontSize: 11, fill: "#FF5A3C" }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs" style={{ color: "#4A5D57" }}>Log your weight on at least two different days to see a trend line here.</p>
            )}
          </div>

          {/* Shopping list */}
          <div className="rounded-xl p-4 mb-6" style={{ background: "#FFFFFF" }}>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart size={16} color="#2F6E63" />
              <p className="font-mono text-xs" style={{ color: "#4A5D57" }}>SHOPPING LIST</p>
            </div>
            <div className="flex gap-2 mb-3">
              {SHOPPING_RANGES.map((r) => (
                <button key={r} onClick={() => setShoppingRange(r)} className="text-xs px-3 py-1.5 rounded-full" style={{ background: shoppingRange === r ? "#2F6E63" : "#EAF2F0", color: shoppingRange === r ? "#FFFFFF" : "#15241F" }}>
                  Next {r} days
                </button>
              ))}
            </div>
            <p className="text-xs mb-3" style={{ color: "#4A5D57" }}>
              Based on the planned schedule for the next {shoppingRange} days, starting today. Exact same ingredient lines are grouped with a count — quantities aren't summed across different recipes. There's no direct integration with grocery apps like Picnic or Albert Heijn from within this tool; use the list below to copy manually.
            </p>
            <div className="flex flex-col gap-1 mb-3 max-h-72 overflow-y-auto">
              {shoppingList.map((item) => (
                <label key={item.text} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md" style={{ background: checkedItems[item.text] ? "#EAF2F0" : "transparent" }}>
                  <input type="checkbox" checked={!!checkedItems[item.text]} onChange={() => persist({ ...data, checkedItems: { ...checkedItems, [item.text]: !checkedItems[item.text] } })} />
                  <span style={{ textDecoration: checkedItems[item.text] ? "line-through" : "none", color: checkedItems[item.text] ? "#4A5D57" : "#15241F" }}>
                    {item.text}{item.count > 1 ? ` (x${item.count})` : ""}
                  </span>
                </label>
              ))}
            </div>
            <label className="text-xs font-medium block mb-1">Copy as text</label>
            <textarea readOnly value={shoppingText} rows={4} className="w-full text-xs px-3 py-2 rounded-lg font-mono" style={{ border: "1px solid #D3E0DB", color: "#4A5D57" }} onFocus={(e) => e.target.select()} />
          </div>

          {/* Week strip */}
          <div className="rounded-xl p-4" style={{ background: "#FFFFFF" }}>
            <p className="font-mono text-xs mb-3" style={{ color: "#4A5D57" }}>THIS WEEK</p>
            <div className="flex justify-between">
              {weekDays.map((d, i) => {
                const k = dateKey(d);
                const f = completion(entries[k]);
                const isActive = k === activeKey;
                return (
                  <div key={k} className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono" style={{ background: f > 0 ? `rgba(47,110,99,${0.25 + f * 0.75})` : "#EAF2F0", color: f > 0.5 ? "#FFFFFF" : "#4A5D57", border: isActive ? "2px solid #FF5A3C" : "2px solid transparent" }}>
                      {d.getDate()}
                    </div>
                    <span className="text-[10px]" style={{ color: "#4A5D57" }}>{d.toLocaleDateString("en-US", { weekday: "narrow" })}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs mt-4 text-center" style={{ color: "#FF5A3C" }}>{error}</p>}
          {!loaded && <p className="text-xs mt-4 text-center" style={{ color: "#4A5D57" }}>Loading data…</p>}
        </div>
      </div>

      {isToday && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center px-4 pb-4 pointer-events-none">
          <div className="max-w-2xl w-full flex gap-2 pointer-events-auto rounded-xl p-2 shadow-lg" style={{ background: "#15241F" }}>
            <button onClick={() => updateDomain("water", 1)} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-white focus-visible:outline focus-visible:outline-2" style={{ background: "rgba(255,255,255,0.08)" }}>
              <Droplet size={16} />
              <span className="text-[11px] font-medium">+1 Water</span>
            </button>
            <button
              onClick={() => {
                const next = MEAL_SLOTS.find((s) => !(day.meals && day.meals[s.id]));
                if (next) toggleMeal(next.id, next.label);
              }}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-white focus-visible:outline focus-visible:outline-2"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <Beef size={16} />
              <span className="text-[11px] font-medium">Log meal</span>
            </button>
            <button onClick={() => setLogActivityOpen(true)} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-white focus-visible:outline focus-visible:outline-2" style={{ background: "rgba(255,255,255,0.08)" }}>
              <Footprints size={16} />
              <span className="text-[11px] font-medium">Log activity</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
