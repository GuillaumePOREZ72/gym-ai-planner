import { authClient } from "./auth";
import type { UserProfile, TrainingPlan, OnboardingFormData } from "../types";

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
