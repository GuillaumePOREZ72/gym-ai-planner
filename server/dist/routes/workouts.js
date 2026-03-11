"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const ai_1 = require("../lib/ai");
const CreateWorkoutSchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").refine((s) => !isNaN(Date.parse(s)), "Date must be a valid calendar date"),
    type: zod_1.z.string().min(1).max(100),
    duration: zod_1.z.number().int().min(1).max(600),
    calories: zod_1.z.number().int().min(0).max(10000),
});
const router = (0, express_1.Router)();
// GET /api/workouts — list workouts for the authenticated user
router.get("/", async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const workouts = await prisma_1.prisma.workout.findMany({
            where: { userId },
            orderBy: { date: "desc" },
        });
        res.json({ workouts });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/workouts — create a workout and generate AI insight
router.post("/", async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const parsed = CreateWorkoutSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten().fieldErrors });
        return;
    }
    const { date, type, duration, calories } = parsed.data;
    let aiInsight;
    try {
        aiInsight = await (0, ai_1.generateWorkoutInsight)({ type, duration, calories });
    }
    catch {
        // Non-fatal: proceed without AI insight
    }
    try {
        const workout = await prisma_1.prisma.workout.create({
            data: { userId, date, type, duration, calories, aiInsight },
        });
        res.status(201).json({ workout });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/workouts/:id
router.delete("/:id", async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const id = req.params.id;
    try {
        const workout = await prisma_1.prisma.workout.findUnique({ where: { id } });
        if (!workout || workout.userId !== userId) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        await prisma_1.prisma.workout.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
