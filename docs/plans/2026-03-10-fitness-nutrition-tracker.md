# Fitness & Nutrition Tracker Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Fitness tracking, Nutrition tracking, and a Dashboard from `health-fitness-tracker` into `gym-ai-planner` with Neon/PostgreSQL persistence and AI insights via OpenRouter.

**Architecture:** Add two new Prisma models (`Workout`, `Meal`), two new Express routes (`/api/workouts`, `/api/meals`), and three new React pages (`/fitness`, `/nutrition`, `/dashboard`). AI insight calls are made after each form submission. Dark mode is implemented via a CSS variable toggle (`data-theme` on `<html>`).

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS v4 (`@theme` variables), Express 5, Prisma + Neon/PostgreSQL, OpenRouter (`liquid/lfm-2.5-1.2b-instruct:free`), `recharts`, `lucide-react`.

---

## Task 1: Add Prisma models for Workout and Meal

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add models to schema**

Append to `server/prisma/schema.prisma`:

```prisma
model Workout {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  date      String   @db.VarChar(10)
  type      String   @db.VarChar(100)
  duration  Int
  calories  Int
  aiInsight String?  @db.Text
  createdAt DateTime @default(now()) @db.Timestamp(6)

  @@index([userId])
}

model Meal {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  date      String   @db.VarChar(10)
  name      String   @db.VarChar(200)
  calories  Int
  protein   Float
  carbs     Float
  fat       Float
  aiInsight String?  @db.Text
  createdAt DateTime @default(now()) @db.Timestamp(6)

  @@index([userId])
}
```

**Step 2: Generate migration and regenerate Prisma client**

```bash
cd server && npx prisma migrate dev --name add_workout_meal
```

Expected: migration file created, Prisma client regenerated with `Workout` and `Meal` types.

**Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add Workout and Meal Prisma models"
```

---

## Task 2: Add AI insight functions

**Files:**
- Modify: `server/source/lib/ai.ts`

**Step 1: Add `generateWorkoutInsight` function**

Append to `server/source/lib/ai.ts`:

```typescript
export async function generateWorkoutInsight(workout: {
  type: string;
  duration: number;
  calories: number;
}): Promise<string> {
  const response = await client.chat.completions.create({
    model: "liquid/lfm-2.5-1.2b-instruct:free",
    messages: [
      {
        role: "system",
        content:
          "You are a fitness coach. Give a short, practical insight (2-3 sentences) about this workout. Be specific and actionable. No markdown.",
      },
      {
        role: "user",
        content: `Workout: ${workout.type}, ${workout.duration} minutes, ${workout.calories} calories burned.`,
      },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}
```

**Step 2: Add `generateMealInsight` function**

Append to `server/source/lib/ai.ts`:

```typescript
export async function generateMealInsight(meal: {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): Promise<string> {
  const response = await client.chat.completions.create({
    model: "liquid/lfm-2.5-1.2b-instruct:free",
    messages: [
      {
        role: "system",
        content:
          "You are a nutritionist. Give a short, practical insight (2-3 sentences) about this meal. Be specific and actionable. No markdown.",
      },
      {
        role: "user",
        content: `Meal: ${meal.name}, ${meal.calories} kcal, ${meal.protein}g protein, ${meal.carbs}g carbs, ${meal.fat}g fat.`,
      },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add server/source/lib/ai.ts
git commit -m "feat: add AI insight functions for workouts and meals"
```

---

## Task 3: Add `/api/workouts` Express route

**Files:**
- Create: `server/source/routes/workouts.ts`
- Modify: `server/source/index.ts`

**Step 1: Create the route file**

```typescript
// server/source/routes/workouts.ts
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { generateWorkoutInsight } from "../lib/ai";

const router = Router();

// GET /api/workouts — list workouts for the authenticated user
router.get("/", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  res.json({ workouts });
});

// POST /api/workouts — create a workout and generate AI insight
router.post("/", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { date, type, duration, calories } = req.body as {
    date: string;
    type: string;
    duration: number;
    calories: number;
  };
  if (!date || !type || !duration || !calories) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  let aiInsight: string | undefined;
  try {
    aiInsight = await generateWorkoutInsight({ type, duration, calories });
  } catch {
    // Non-fatal: proceed without AI insight
  }

  const workout = await prisma.workout.create({
    data: { userId, date, type, duration: Number(duration), calories: Number(calories), aiInsight },
  });
  res.status(201).json({ workout });
});

// DELETE /api/workouts/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { id } = req.params;
  const workout = await prisma.workout.findUnique({ where: { id } });
  if (!workout || workout.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await prisma.workout.delete({ where: { id } });
  res.status(204).send();
});

export default router;
```

**Step 2: Register route in `server/source/index.ts`**

Add import and `app.use` call:

```typescript
import workoutsRouter from "./routes/workouts";
// ...
app.use("/api/workouts", workoutsRouter);
```

**Step 3: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add server/source/routes/workouts.ts server/source/index.ts
git commit -m "feat: add /api/workouts route with AI insight on creation"
```

---

## Task 4: Add `/api/meals` Express route

**Files:**
- Create: `server/source/routes/meals.ts`
- Modify: `server/source/index.ts`

**Step 1: Create the route file**

```typescript
// server/source/routes/meals.ts
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { generateMealInsight } from "../lib/ai";

const router = Router();

// GET /api/meals
router.get("/", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const meals = await prisma.meal.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  res.json({ meals });
});

// POST /api/meals
router.post("/", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { date, name, calories, protein, carbs, fat } = req.body as {
    date: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  if (!date || !name || calories == null || protein == null || carbs == null || fat == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  let aiInsight: string | undefined;
  try {
    aiInsight = await generateMealInsight({
      name,
      calories: Number(calories),
      protein: Number(protein),
      carbs: Number(carbs),
      fat: Number(fat),
    });
  } catch {
    // Non-fatal
  }

  const meal = await prisma.meal.create({
    data: {
      userId,
      date,
      name,
      calories: Number(calories),
      protein: Number(protein),
      carbs: Number(carbs),
      fat: Number(fat),
      aiInsight,
    },
  });
  res.status(201).json({ meal });
});

// DELETE /api/meals/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { id } = req.params;
  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal || meal.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await prisma.meal.delete({ where: { id } });
  res.status(204).send();
});

export default router;
```

**Step 2: Register route in `server/source/index.ts`**

```typescript
import mealsRouter from "./routes/meals";
// ...
app.use("/api/meals", mealsRouter);
```

**Step 3: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add server/source/routes/meals.ts server/source/index.ts
git commit -m "feat: add /api/meals route with AI insight on creation"
```

---

## Task 5: Add frontend types and API helpers

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

**Step 1: Add `Workout` and `Meal` types**

Append to `frontend/src/types/index.ts`:

```typescript
export interface Workout {
  id: string;
  userId: string;
  date: string;
  type: string;
  duration: number;
  calories: number;
  aiInsight?: string;
  createdAt: string;
}

export interface Meal {
  id: string;
  userId: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  aiInsight?: string;
  createdAt: string;
}
```

**Step 2: Add API helper functions**

Append to `frontend/src/lib/api.ts`:

```typescript
import type { Workout, Meal } from "../types";

// --- Workouts ---

export async function getWorkouts(): Promise<Workout[]> {
  const result = await apiFetch<{ workouts: Workout[] }>("/api/workouts");
  return result.workouts;
}

export async function createWorkout(data: {
  date: string;
  type: string;
  duration: number;
  calories: number;
}): Promise<Workout> {
  const result = await apiFetch<{ workout: Workout }>("/api/workouts", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return result.workout;
}

export async function deleteWorkout(id: string): Promise<void> {
  await apiFetch<void>(`/api/workouts/${id}`, { method: "DELETE" });
}

// --- Meals ---

export async function getMeals(): Promise<Meal[]> {
  const result = await apiFetch<{ meals: Meal[] }>("/api/meals");
  return result.meals;
}

export async function createMeal(data: {
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): Promise<Meal> {
  const result = await apiFetch<{ meal: Meal }>("/api/meals", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return result.meal;
}

export async function deleteMeal(id: string): Promise<void> {
  await apiFetch<void>(`/api/meals/${id}`, { method: "DELETE" });
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat: add Workout/Meal types and API helpers"
```

---

## Task 6: Install recharts

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install recharts**

```bash
cd frontend && npm install recharts
```

**Step 2: Verify types are available**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add recharts dependency"
```

---

## Task 7: Implement dark mode toggle

**Context:** The project uses a fixed dark color scheme in `index.css` (`--color-background: #0a0a0a`). Dark mode means toggling between the existing dark palette (default) and a light palette. The toggle stores the preference in `localStorage` and sets `data-theme="light"` on `<html>`.

**Files:**
- Modify: `frontend/src/index.css`
- Create: `frontend/src/context/ThemeContext.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Add light theme CSS variables**

In `frontend/src/index.css`, after the existing `@theme` block, add:

```css
[data-theme="light"] {
  --color-background: #f4f4f5;
  --color-foreground: #09090b;
  --color-muted: #71717a;
  --color-border: #e4e4e7;
  --color-card: #ffffff;
  --color-accent: #65a30d;
  --color-accent-hover: #4d7c0f;
}
```

**Step 2: Create ThemeContext**

```typescript
// frontend/src/context/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) ?? "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

**Step 3: Wrap App in ThemeProvider**

In `frontend/src/App.tsx`, import and wrap:

```tsx
import { ThemeProvider } from "./context/ThemeContext";
// ...
return (
  <ThemeProvider>
    <NeonAuthUIProvider ...>
      ...
    </NeonAuthUIProvider>
  </ThemeProvider>
);
```

**Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add frontend/src/index.css frontend/src/context/ThemeContext.tsx frontend/src/App.tsx
git commit -m "feat: add dark/light theme toggle with ThemeContext and CSS variables"
```

---

## Task 8: Add DarkMode toggle button to Navbar

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`

**Step 1: Import `useTheme` and add toggle button**

In `Navbar.tsx`, import `useTheme` and add a `<button>` before the avatar link that calls `toggleTheme()`. Use `lucide-react` icons `Sun` and `Moon`:

```tsx
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// Inside the component:
const { theme, toggleTheme } = useTheme();

// In JSX, add before the avatar:
<button
  onClick={toggleTheme}
  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
  className="p-2 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
>
  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
</button>
```

**Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx
git commit -m "feat: add dark/light mode toggle button to Navbar"
```

---

## Task 9: Implement Fitness page

**Context:** Uses the design from `health-fitness-tracker/src/pages/Fitness.tsx` but:
- Fetches workouts from `/api/workouts` instead of local state
- Calls `createWorkout()` on form submit; shows AI insight after creation
- Uses `var(--color-card)`, `var(--color-border)`, `var(--color-accent)` for theming (no `dark:` Tailwind classes)
- Uses existing `Button`, `Input`, `Card` components from `frontend/src/components/ui/`
- Replaces hardcoded indigo with `var(--color-accent)`

**Files:**
- Create: `frontend/src/pages/Fitness.tsx`

**Step 1: Create the page**

```tsx
// frontend/src/pages/Fitness.tsx
import { useEffect, useState } from "react";
import { PlusCircle, Dumbbell, TrendingUp, Trash2, Sparkles } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import type { Workout } from "../types";
import { getWorkouts, createWorkout, deleteWorkout } from "../lib/api";

type WorkoutForm = { date: string; type: string; duration: string; calories: string };

export default function Fitness() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [form, setForm] = useState<WorkoutForm>({ date: "", type: "", duration: "", calories: "" });
  const [latestInsight, setLatestInsight] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWorkouts().then(setWorkouts).catch(() => setError("Failed to load workouts."));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setLatestInsight(null);
    try {
      const workout = await createWorkout({
        date: form.date,
        type: form.type,
        duration: Number(form.duration),
        calories: Number(form.calories),
      });
      setWorkouts((prev) => [workout, ...prev]);
      if (workout.aiInsight) setLatestInsight(workout.aiInsight);
      setForm({ date: "", type: "", duration: "", calories: "" });
    } catch {
      setError("Failed to save workout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteWorkout(id);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const total = workouts.reduce((s, w) => ({ duration: s.duration + w.duration, calories: s.calories + w.calories }), { duration: 0, calories: 0 });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Suivi Fitness</h1>

      {/* Add workout form */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5" /> Ajouter un entraînement
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input name="date" type="date" value={form.date} onChange={handleChange} required
            className="col-span-1 px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)]" />
          <input name="type" type="text" placeholder="Type d'entraînement" value={form.type} onChange={handleChange} required
            className="col-span-1 px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)]" />
          <input name="duration" type="number" min="1" placeholder="Durée (minutes)" value={form.duration} onChange={handleChange} required
            className="col-span-1 px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)]" />
          <input name="calories" type="number" min="1" placeholder="Calories brûlées" value={form.calories} onChange={handleChange} required
            className="col-span-1 px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)]" />
          <button type="submit" disabled={isSubmitting}
            className="col-span-2 py-2 rounded-lg bg-[var(--color-accent)] text-black font-semibold hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50">
            {isSubmitting ? "Enregistrement…" : "Ajouter l'entraînement"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {latestInsight && (
          <div className="mt-4 flex gap-2 p-3 rounded-lg border border-[var(--color-accent)] bg-[var(--color-background)]">
            <Sparkles className="w-4 h-4 mt-0.5 text-[var(--color-accent)] shrink-0" />
            <p className="text-sm text-[var(--color-muted)]">{latestInsight}</p>
          </div>
        )}
      </div>

      {/* History table */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Dumbbell className="w-5 h-5" /> Historique
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Durée</th>
                <th className="pb-2 pr-4">Calories</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {workouts.map((w) => (
                <tr key={w.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2 pr-4">{w.date}</td>
                  <td className="py-2 pr-4">{w.type}</td>
                  <td className="py-2 pr-4">{w.duration} min</td>
                  <td className="py-2 pr-4">{w.calories} kcal</td>
                  <td className="py-2">
                    <button onClick={() => handleDelete(w.id)} aria-label="Supprimer"
                      className="text-[var(--color-muted)] hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {workouts.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-[var(--color-muted)]">Aucun entraînement enregistré.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart */}
      {workouts.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Progression
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={[...workouts].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="duration" stroke="var(--color-accent)" name="Durée (min)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="calories" stroke="#82ca9d" name="Calories" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
          <p className="text-sm text-[var(--color-muted)]">Total séances</p>
          <p className="text-3xl font-bold mt-1">{workouts.length}</p>
        </div>
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
          <p className="text-sm text-[var(--color-muted)]">Calories brûlées</p>
          <p className="text-3xl font-bold mt-1 text-[var(--color-accent)]">{total.calories} kcal</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/src/pages/Fitness.tsx
git commit -m "feat: add Fitness tracking page with DB persistence and AI insight"
```

---

## Task 10: Implement Nutrition page

**Context:** Same pattern as Fitness. Fetches from `/api/meals`, calls `createMeal()`, shows AI insight. No `dark:` classes — uses CSS variables.

**Files:**
- Create: `frontend/src/pages/Nutrition.tsx`

**Step 1: Create the page**

```tsx
// frontend/src/pages/Nutrition.tsx
import { useEffect, useState } from "react";
import { PlusCircle, Utensils, Trash2, Sparkles } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import type { Meal } from "../types";
import { getMeals, createMeal, deleteMeal } from "../lib/api";

type MealForm = { date: string; name: string; calories: string; protein: string; carbs: string; fat: string };

export default function Nutrition() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [form, setForm] = useState<MealForm>({ date: "", name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [latestInsight, setLatestInsight] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMeals().then(setMeals).catch(() => setError("Failed to load meals."));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setLatestInsight(null);
    try {
      const meal = await createMeal({
        date: form.date,
        name: form.name,
        calories: Number(form.calories),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fat: Number(form.fat),
      });
      setMeals((prev) => [meal, ...prev]);
      if (meal.aiInsight) setLatestInsight(meal.aiInsight);
      setForm({ date: "", name: "", calories: "", protein: "", carbs: "", fat: "" });
    } catch {
      setError("Failed to save meal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMeal(id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
  };

  const totals = meals.reduce(
    (s, m) => ({ calories: s.calories + m.calories, protein: s.protein + m.protein, carbs: s.carbs + m.carbs, fat: s.fat + m.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const macroData = [
    { name: "Protéines", value: Math.round(totals.protein) },
    { name: "Glucides", value: Math.round(totals.carbs) },
    { name: "Lipides", value: Math.round(totals.fat) },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Suivi Nutritionnel</h1>

      {/* Form */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5" /> Ajouter un repas
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          {[
            { name: "date", type: "date", placeholder: "" },
            { name: "name", type: "text", placeholder: "Nom du repas" },
            { name: "calories", type: "number", placeholder: "Calories" },
            { name: "protein", type: "number", placeholder: "Protéines (g)" },
            { name: "carbs", type: "number", placeholder: "Glucides (g)" },
            { name: "fat", type: "number", placeholder: "Lipides (g)" },
          ].map((f) => (
            <input key={f.name} name={f.name} type={f.type} placeholder={f.placeholder}
              value={form[f.name as keyof MealForm]} onChange={handleChange} required min={f.type === "number" ? "0" : undefined}
              className="px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)]" />
          ))}
          <button type="submit" disabled={isSubmitting}
            className="col-span-2 py-2 rounded-lg bg-[var(--color-accent)] text-black font-semibold hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50">
            {isSubmitting ? "Enregistrement…" : "Ajouter le repas"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {latestInsight && (
          <div className="mt-4 flex gap-2 p-3 rounded-lg border border-[var(--color-accent)] bg-[var(--color-background)]">
            <Sparkles className="w-4 h-4 mt-0.5 text-[var(--color-accent)] shrink-0" />
            <p className="text-sm text-[var(--color-muted)]">{latestInsight}</p>
          </div>
        )}
      </div>

      {/* Journal */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Utensils className="w-5 h-5" /> Journal alimentaire
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Repas</th>
                <th className="pb-2 pr-3">kcal</th>
                <th className="pb-2 pr-3">P</th>
                <th className="pb-2 pr-3">G</th>
                <th className="pb-2 pr-3">L</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {meals.map((m) => (
                <tr key={m.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2 pr-3">{m.date}</td>
                  <td className="py-2 pr-3">{m.name}</td>
                  <td className="py-2 pr-3">{m.calories}</td>
                  <td className="py-2 pr-3">{m.protein}g</td>
                  <td className="py-2 pr-3">{m.carbs}g</td>
                  <td className="py-2 pr-3">{m.fat}g</td>
                  <td className="py-2">
                    <button onClick={() => handleDelete(m.id)} aria-label="Supprimer"
                      className="text-[var(--color-muted)] hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {meals.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-[var(--color-muted)]">Aucun repas enregistré.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Macro chart */}
      {meals.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Répartition des macronutriments</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={macroData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }} />
              <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Calories totales", value: `${totals.calories} kcal`, color: "text-[var(--color-accent)]" },
          { label: "Protéines", value: `${Math.round(totals.protein)}g`, color: "" },
          { label: "Glucides", value: `${Math.round(totals.carbs)}g`, color: "" },
          { label: "Lipides", value: `${Math.round(totals.fat)}g`, color: "" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
            <p className="text-sm text-[var(--color-muted)]">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/src/pages/Nutrition.tsx
git commit -m "feat: add Nutrition tracking page with DB persistence and AI insight"
```

---

## Task 11: Implement Dashboard page

**Context:** Fetches both workouts and meals, shows line chart (workout duration/calories over time), stacked bar chart (macro breakdown per day), and weekly summary stats.

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`

**Step 1: Create the page**

```tsx
// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Activity, Utensils, TrendingUp, BarChart2 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { Workout, Meal } from "../types";
import { getWorkouts, getMeals } from "../lib/api";

export default function Dashboard() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getWorkouts(), getMeals()])
      .then(([w, m]) => { setWorkouts(w); setMeals(m); })
      .finally(() => setIsLoading(false));
  }, []);

  // Last 7 workouts (most recent first → reverse for chart)
  const recentWorkouts = [...workouts].reverse().slice(-7);

  // Aggregate meals by date for macro chart
  const mealsByDate = meals.reduce<Record<string, { date: string; protein: number; carbs: number; fat: number }>>(
    (acc, m) => {
      if (!acc[m.date]) acc[m.date] = { date: m.date, protein: 0, carbs: 0, fat: 0 };
      acc[m.date].protein += m.protein;
      acc[m.date].carbs += m.carbs;
      acc[m.date].fat += m.fat;
      return acc;
    },
    {}
  );
  const recentMealDays = Object.values(mealsByDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  // Weekly stats (last 7 days)
  const weekWorkouts = workouts.slice(0, 7);
  const totalCaloriesBurned = weekWorkouts.reduce((s, w) => s + w.calories, 0);
  const totalMealCalories = meals.slice(0, 7).reduce((s, m) => s + m.calories, 0);
  const avgMealCalories = meals.length > 0 ? Math.round(totalMealCalories / Math.min(meals.length, 7)) : 0;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-[var(--color-muted)]">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Tableau de bord</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Workout chart */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Activité physique récente
          </h2>
          {recentWorkouts.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={recentWorkouts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="duration" stroke="var(--color-accent)" name="Durée (min)" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="calories" stroke="#82ca9d" name="Calories" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Aucun entraînement enregistré.</p>
          )}
        </div>

        {/* Macro chart */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Utensils className="w-5 h-5" /> Apport nutritionnel récent
          </h2>
          {recentMealDays.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={recentMealDays}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }} />
                <Legend />
                <Bar dataKey="protein" stackId="a" fill="var(--color-accent)" name="Protéines" radius={[0, 0, 0, 0]} />
                <Bar dataKey="carbs" stackId="a" fill="#82ca9d" name="Glucides" />
                <Bar dataKey="fat" stackId="a" fill="#ffc658" name="Lipides" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Aucun repas enregistré.</p>
          )}
        </div>
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Activity className="w-6 h-6" />, title: "Entraînements", value: String(weekWorkouts.length), desc: "cette semaine" },
          { icon: <BarChart2 className="w-6 h-6" />, title: "Calories brûlées", value: `${totalCaloriesBurned}`, desc: "kcal cette semaine" },
          { icon: <Utensils className="w-6 h-6" />, title: "Moy. calorique", value: `${avgMealCalories}`, desc: "kcal par repas" },
          { icon: <TrendingUp className="w-6 h-6" />, title: "Total séances", value: String(workouts.length), desc: "au total" },
        ].map((s) => (
          <div key={s.title} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-[var(--color-accent)] mb-2">{s.icon}</div>
            <p className="text-sm text-[var(--color-muted)]">{s.title}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: add Dashboard page with workout and nutrition charts"
```

---

## Task 12: Wire routes in App.tsx and add Navbar links

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Navbar.tsx`

**Step 1: Add routes to App.tsx**

Import the 3 new pages and add routes:

```tsx
import Fitness from "./pages/Fitness";
import Nutrition from "./pages/Nutrition";
import Dashboard from "./pages/Dashboard";

// Inside <Routes>:
<Route path="fitness" element={<Fitness />} />
<Route path="nutrition" element={<Nutrition />} />
<Route path="dashboard" element={<Dashboard />} />
```

**Step 2: Add nav links to Navbar.tsx**

Add `<Link>` elements to `/fitness`, `/nutrition`, `/dashboard` in the Navbar. These should only appear when the user is authenticated (use `useAuth()` — already in the component).

```tsx
// Example nav links (adapt to existing Navbar layout):
<Link to="/dashboard" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
  Dashboard
</Link>
<Link to="/fitness" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
  Fitness
</Link>
<Link to="/nutrition" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors">
  Nutrition
</Link>
```

**Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

**Step 4: Run dev server and manually verify pages load**

```bash
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

Navigate to `/fitness`, `/nutrition`, `/dashboard`. Check:
- Pages render without console errors
- Forms submit and new entries appear in the list
- AI insight appears below the form after submission
- Dark/light toggle works
- Navbar links are visible when logged in

**Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/Navbar.tsx
git commit -m "feat: register fitness/nutrition/dashboard routes and add Navbar links"
```

---

## Task 13: Final check

**Step 1: Run TypeScript on both packages**

```bash
cd server && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

Both should produce zero errors.

**Step 2: Build frontend**

```bash
cd frontend && npm run build
```

Expected: build succeeds with no errors.

**Step 3: Commit if any remaining changes**

```bash
git add -A
git commit -m "chore: final type-check and build verification"
```
