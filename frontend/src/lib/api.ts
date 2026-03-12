import { authClient } from "./auth";
import type { UserProfile, TrainingPlan, OnboardingFormData, Workout, Meal, WeeklyReport } from "../types";

const API_URL = import.meta.env.VITE_API_URL as string;

async function getToken(): Promise<string> {
  const result = await authClient.getSession();
  const token = result?.data?.session?.token;
  if (!token) throw new Error("Not authenticated");
  return token;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function saveProfile(data: OnboardingFormData): Promise<UserProfile> {
  const result = await apiFetch<{ profile: UserProfile }>("/api/profile", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      daysPerWeek: Number(data.daysPerWeek),
      sessionLength: Number(data.sessionLength),
    }),
  });
  return result.profile;
}

export async function generatePlan(): Promise<TrainingPlan> {
  const result = await apiFetch<{ plan: TrainingPlan }>("/api/plan/generate", {
    method: "POST",
  });
  return result.plan;
}

export async function getPlan(): Promise<TrainingPlan | null> {
  const result = await apiFetch<{ plan: TrainingPlan | null }>("/api/plan");
  return result.plan;
}

export async function getProfile(): Promise<UserProfile | null> {
  try {
    const result = await apiFetch<{ profile: UserProfile | null }>("/api/profile");
    return result.profile;
  } catch {
    return null;
  }
}

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

// --- Weekly Report ---

export async function getWeeklyReport(): Promise<WeeklyReport | null> {
  try {
    const result = await apiFetch<{ report: WeeklyReport | null }>("/api/report/weekly");
    return result.report;
  } catch {
    return null;
  }
}

export async function generateWeeklyReport(lang: string = "en"): Promise<WeeklyReport> {
  const result = await apiFetch<{ report: WeeklyReport }>("/api/report/weekly", {
    method: "POST",
    body: JSON.stringify({ lang }),
  });
  return result.report;
}
