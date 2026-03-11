"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProfileData = normalizeProfileData;
exports.generateTrainingPlan = generateTrainingPlan;
exports.generateWorkoutInsight = generateWorkoutInsight;
exports.generateMealInsight = generateMealInsight;
exports.generateWeeklyReport = generateWeeklyReport;
const openai_1 = __importDefault(require("openai"));
const GoalMap = {
    bulk: "build muscle and gain size",
    cut: "lose fat and maintain muscle",
    recomp: "recompose body (lose fat while gaining muscle simultaneously)",
    strength: "increase maximal strength and power output",
    endurance: "improve cardiovascular endurance and muscular stamina",
};
const ExpMap = {
    beginner: "0-1 years of experience, focus on form and movement patterns",
    intermediate: "1-3 years of experience, familiar with major compound lifts",
    advanced: "5+ years of experience, high intensity and complex programming",
};
const EquipmentMap = {
    full_gym: "full access to barbells, cables, machines, and free weights",
    home: "limited bodyweight and basic equipment (resistance bands, light dumbbells)",
    dumbbells: "access to only a pair of adjustable dumbbells",
};
const SplitMap = {
    full: "full body sessions each training day",
    upper_lower: "alternating upper body and lower body sessions",
    push_pull: "push muscles (chest/shoulders/triceps) and pull muscles (back/biceps) split",
    chest_back: "chest and back focused days",
    legs_arms: "legs and arms dedicated days",
};
function normalizeProfileData(profile) {
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
const client = new openai_1.default({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});
async function generateTrainingPlan(profile) {
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
                content: "You are an expert fitness coach. Respond exclusively in pure JSON with no markdown, no code blocks. Structure: { overview: string, weeklySchedule: [{ day: string, focus: string, exercises: [{ name: string, sets: number, reps: string, rest: string, rpe: number, notes?: string, alternatives?: string[] }] }], progression: string }",
            },
            { role: "user", content: userPrompt },
        ],
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    let planJson;
    try {
        planJson = JSON.parse(raw);
    }
    catch {
        planJson = { overview: "Plan generation failed. Please try again.", weeklySchedule: [], progression: "" };
    }
    return { planJson, planText: raw };
}
/**
 * Generates a short AI coaching insight for a logged workout.
 * @throws If the LLM call fails (network error, rate limit, etc.).
 *         Callers are responsible for catching and treating as non-fatal.
 */
async function generateWorkoutInsight(workout) {
    const response = await client.chat.completions.create({
        model: "liquid/lfm-2.5-1.2b-instruct:free",
        messages: [
            {
                role: "system",
                content: "You are a fitness coach. Give a short, practical insight (2-3 sentences) about this workout. Be specific and actionable. No markdown.",
            },
            {
                role: "user",
                content: `Workout: ${workout.type}, ${workout.duration} minutes, ${workout.calories} calories burned.`,
            },
        ],
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
}
/**
 * Generates a short AI nutritionist insight for a logged meal.
 * @throws If the LLM call fails (network error, rate limit, etc.).
 *         Callers are responsible for catching and treating as non-fatal.
 */
async function generateMealInsight(meal) {
    const response = await client.chat.completions.create({
        model: "liquid/lfm-2.5-1.2b-instruct:free",
        messages: [
            {
                role: "system",
                content: "You are a nutritionist. Give a short, practical insight (2-3 sentences) about this meal. Be specific and actionable. No markdown.",
            },
            {
                role: "user",
                content: `Meal: ${meal.name}, ${meal.calories} kcal, ${meal.protein}g protein, ${meal.carbs}g carbs, ${meal.fat}g fat.`,
            },
        ],
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
}
/**
 * Generates a weekly coaching check-in summary for the user.
 * @throws If the LLM call fails (network error, rate limit, etc.).
 *         Callers are responsible for catching and propagating via next(err).
 */
async function generateWeeklyReport(params) {
    const { profile, workouts, mealDays } = params;
    // Cap to last 14 entries to avoid unbounded prompt length
    const cappedWorkouts = workouts.slice(-14);
    const cappedMeals = mealDays.slice(-14);
    const workoutSummary = cappedWorkouts.length === 0
        ? "No workouts logged this week."
        : cappedWorkouts.map((w) => `- ${w.date}: ${w.type}, ${w.duration} min, ${w.calories} kcal`).join("\n");
    const mealSummary = cappedMeals.length === 0
        ? "No meals logged this week."
        : cappedMeals.map((d) => `- ${d.date}: ${d.totalCalories} kcal, ${(d.totalProtein || 0).toFixed(1)}g protein`).join("\n");
    const userPrompt = `
User profile:
- Goal: ${GoalMap[profile.goal] || profile.goal}
- Experience: ${ExpMap[profile.experience] || profile.experience}
- Target: ${profile.daysPerWeek} training days/week, ${profile.sessionLength} min/session

This week's workouts (${cappedWorkouts.length} logged):
${workoutSummary}

This week's nutrition by day (${cappedMeals.length} days logged):
${mealSummary}
`.trim();
    const response = await client.chat.completions.create({
        model: "liquid/lfm-2.5-1.2b-instruct:free",
        messages: [
            {
                role: "system",
                content: "You are a concise, practical fitness coach writing a weekly check-in summary. Write 3 to 5 sentences in plain English. Mention what went well, what could be improved, and one concrete recommendation for next week. No markdown, no bullet points, no lists. Speak directly to the user.",
            },
            { role: "user", content: userPrompt },
        ],
    });
    const content = response.choices[0]?.message?.content?.trim() ?? "";
    if (!content)
        throw new Error("Weekly report: LLM returned an empty response.");
    return content;
}
