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
