import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { generateWeeklyReport } from "../lib/ai";

const router = Router();

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.userId ?? "anonymous",

  message: { error: "Weekly report generation limit reached. Try again in an hour." },
});

router.get("/weekly", async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const report = await prisma.weeklyReport.findUnique({ where: { userId } });
    res.json({ report });
  } catch (err) {
    next(err);
  }
});

router.post("/weekly", reportLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const profile = await prisma.userProfiles.findUnique({ where: { userId } });
    if (!profile) {
      res.status(404).json({ error: "Profile not found. Complete onboarding first." });
      return;
    }

    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    const weekStart = monday.toISOString().slice(0, 10);
    // NOTE: weekStart is computed in server (UTC) time. Users in negative-UTC-offset
    // timezones may see a slightly different week boundary near midnight Sunday.

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
    // date is stored as 'YYYY-MM-DD'; string comparison is lexicographically correct

    const [workouts, meals] = await Promise.all([
      prisma.workout.findMany({ where: { userId, date: { gte: sevenDaysAgoStr } }, orderBy: { date: "asc" } }),
      prisma.meal.findMany({ where: { userId, date: { gte: sevenDaysAgoStr } }, orderBy: { date: "asc" } }),
    ]);

    const mealsByDay = meals.reduce<Record<string, { totalCalories: number; totalProtein: number }>>(
      (acc, m) => {
        if (!acc[m.date]) acc[m.date] = { totalCalories: 0, totalProtein: 0 };
        acc[m.date].totalCalories += m.calories;
        acc[m.date].totalProtein += m.protein;
        return acc;
      },
      {}
    );
    const mealDays = Object.entries(mealsByDay).map(([date, v]) => ({ date, ...v }));

    const lang = typeof req.body?.lang === "string" && req.body.lang === "fr" ? "fr" : "en";

    const reportText = await generateWeeklyReport({
      profile: {
        goal: profile.goal,
        experience: profile.experience,
        daysPerWeek: profile.daysPerWeek,
        sessionLength: profile.sessionLength,
      },
      workouts,
      mealDays,
      language: lang,
    });

    const report = await prisma.weeklyReport.upsert({
      where: { userId },
      update: { reportText, weekStart },
      create: { userId, reportText, weekStart },
    });

    res.json({ report });
  } catch (err) {
    next(err);
  }
});

export default router;
