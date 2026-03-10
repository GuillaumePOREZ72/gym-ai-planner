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

  const total = workouts.reduce((s, w) => ({ calories: s.calories + w.calories }), { calories: 0 });

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
