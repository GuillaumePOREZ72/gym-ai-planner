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
