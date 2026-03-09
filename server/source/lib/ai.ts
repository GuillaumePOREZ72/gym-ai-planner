import OpenAI from "openai";
import type { UserProfiles } from "@prisma/client";

const GoalMap: Record<string, string> = {
  bulk: "build muscle and gain size",
  cut: "lose fat and maintain muscle",
  recomp: "recompose body (lose fat while gaining muscle simultaneously)",
  strength: "increase maximal strength and power output",
  endurance: "improve cardiovascular endurance and muscular stamina",
};

const ExpMap: Record<string, string> = {
  beginner: "0-1 years of experience, focus on form and movement patterns",
  intermediate: "1-3 years of experience, familiar with major compound lifts",
  advanced: "5+ years of experience, high intensity and complex programming",
};

const EquipmentMap: Record<string, string> = {
  full_gym: "full access to barbells, cables, machines, and free weights",
  home: "limited bodyweight and basic equipment (resistance bands, light dumbbells)",
  dumbbells: "access to only a pair of adjustable dumbbells",
};

const SplitMap: Record<string, string> = {
  full: "full body sessions each training day",
  upper_lower: "alternating upper body and lower body sessions",
  push_pull: "push muscles (chest/shoulders/triceps) and pull muscles (back/biceps) split",
  chest_back: "chest and back focused days",
  legs_arms: "legs and arms dedicated days",
};

interface NormalizedProfile {
  goal: string;
  experience: string;
  daysPerWeek: number;
  sessionLength: number;
  equipment: string;
  preferredSplit: string;
  injuries: string | null;
}

export function normalizeProfileData(profile: Partial<UserProfiles>): NormalizedProfile {
  return {
    goal: profile.goal || "bulk",
    experience: profile.experience || "intermediate",
    daysPerWeek: profile.daysPerWeek ?? 4,
    sessionLength: profile.sessionLength ?? 60,
    equipment: profile.equipment || "full_gym",
    preferredSplit: profile.preferredSplit || "upper_lower",
    injuries: profile.injuries || null,
  };
}

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function generateTrainingPlan(profile: UserProfiles): Promise<{ planJson: object; planText: string }> {
  const p = normalizeProfileData(profile);

  const injuriesNote = p.injuries
    ? `The user has the following injuries or limitations: ${p.injuries}. Include alternative exercises for all affected movements.`
    : "The user has no reported injuries.";

  const userPrompt = `
Create a personalized training plan for a user with the following profile:
- Goal: ${GoalMap[p.goal] || p.goal}
- Experience: ${ExpMap[p.experience] || p.experience}
- Training frequency: ${p.daysPerWeek} days per week
- Session duration: ${p.sessionLength} minutes per session
- Equipment: ${EquipmentMap[p.equipment] || p.equipment}
- Preferred split: ${SplitMap[p.preferredSplit] || p.preferredSplit}
- ${injuriesNote}

Constraints:
- 4 to 6 exercises per session
- RPE between 6 and 9 for all exercises
- Prioritize compound (multi-joint) movements
- Format sets x reps as a string like "3 x 8-12"
- Rest times as strings like "90s" or "2min"
${p.injuries ? "- Include an 'alternatives' array for exercises that may aggravate reported injuries" : ""}
`.trim();

  const response = await client.chat.completions.create({
    model: "liquid/lfm-2.5-1.2b-instruct:free",
    messages: [
      {
        role: "system",
        content:
          "You are an expert fitness coach. Respond exclusively in pure JSON with no markdown, no code blocks. Structure: { overview: string, weeklySchedule: [{ day: string, focus: string, exercises: [{ name: string, sets: number, reps: string, rest: string, rpe: number, notes?: string, alternatives?: string[] }] }], progression: string }",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  let planJson: object;
  try {
    planJson = JSON.parse(raw);
  } catch {
    planJson = { overview: "Plan generation failed. Please try again.", weeklySchedule: [], progression: "" };
  }

  return { planJson, planText: raw };
}
