export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  goal: "bulk" | "cut" | "recomp" | "strength" | "endurance";
  experience: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  sessionLength: number;
  equipment: "full_gym" | "home" | "dumbbells";
  preferredSplit: "full" | "upper_lower" | "push_pull" | "chest_back" | "legs_arms";
  injuries?: string;
  updatedAt: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  rpe: number;
  notes?: string;
  alternatives?: string[];
}

export interface WeeklySession {
  day: string;
  focus: string;
  exercises: Exercise[];
}

export interface TrainingPlan {
  id: string;
  userId: string;
  planJson: {
    overview: string;
    weeklySchedule: WeeklySession[];
    progression: string;
  };
  planText: string;
  version: number;
  createdAt: string;
}

export interface OnboardingFormData {
  goal: string;
  experience: string;
  daysPerWeek: string;
  sessionLength: string;
  equipment: string;
  preferredSplit: string;
  injuries: string;
}