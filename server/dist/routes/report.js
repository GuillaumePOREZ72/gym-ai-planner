"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const prisma_1 = require("../lib/prisma");
const ai_1 = require("../lib/ai");
const router = (0, express_1.Router)();
const reportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.userId ?? req.ip ?? "unknown",
    message: { error: "Weekly report generation limit reached. Try again in an hour." },
});
router.get("/weekly", async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const report = await prisma_1.prisma.weeklyReport.findUnique({ where: { userId } });
        res.json({ report });
    }
    catch (err) {
        next(err);
    }
});
router.post("/weekly", reportLimiter, async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const profile = await prisma_1.prisma.userProfiles.findUnique({ where: { userId } });
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
            prisma_1.prisma.workout.findMany({ where: { userId, date: { gte: sevenDaysAgoStr } }, orderBy: { date: "asc" } }),
            prisma_1.prisma.meal.findMany({ where: { userId, date: { gte: sevenDaysAgoStr } }, orderBy: { date: "asc" } }),
        ]);
        const mealsByDay = meals.reduce((acc, m) => {
            if (!acc[m.date])
                acc[m.date] = { totalCalories: 0, totalProtein: 0 };
            acc[m.date].totalCalories += m.calories;
            acc[m.date].totalProtein += m.protein;
            return acc;
        }, {});
        const mealDays = Object.entries(mealsByDay).map(([date, v]) => ({ date, ...v }));
        const reportText = await (0, ai_1.generateWeeklyReport)({
            profile: {
                goal: profile.goal,
                experience: profile.experience,
                daysPerWeek: profile.daysPerWeek,
                sessionLength: profile.sessionLength,
            },
            workouts,
            mealDays,
        });
        const report = await prisma_1.prisma.weeklyReport.upsert({
            where: { userId },
            update: { reportText, weekStart },
            create: { userId, reportText, weekStart },
        });
        res.json({ report });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
