"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const ai_1 = require("../lib/ai");
const CreateMealSchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").refine((s) => !isNaN(Date.parse(s)), "Date must be a valid calendar date"),
    name: zod_1.z.string().min(1).max(200),
    calories: zod_1.z.number().int().min(0).max(10000),
    protein: zod_1.z.number().min(0).max(1000),
    carbs: zod_1.z.number().min(0).max(1000),
    fat: zod_1.z.number().min(0).max(1000),
});
const router = (0, express_1.Router)();
// GET /api/meals — list meals for the authenticated user
router.get("/", async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const meals = await prisma_1.prisma.meal.findMany({
            where: { userId },
            orderBy: { date: "desc" },
        });
        res.json({ meals });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/meals — create a meal and generate AI insight
router.post("/", async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const parsed = CreateMealSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten().fieldErrors });
        return;
    }
    const { date, name, calories, protein, carbs, fat } = parsed.data;
    let aiInsight;
    try {
        aiInsight = await (0, ai_1.generateMealInsight)({
            name,
            calories,
            protein,
            carbs,
            fat,
        });
    }
    catch {
        // Non-fatal: proceed without AI insight
    }
    try {
        const meal = await prisma_1.prisma.meal.create({
            data: {
                userId,
                date,
                name,
                calories,
                protein,
                carbs,
                fat,
                aiInsight,
            },
        });
        res.status(201).json({ meal });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/meals/:id
router.delete("/:id", async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const id = req.params.id;
    try {
        const meal = await prisma_1.prisma.meal.findUnique({ where: { id } });
        if (!meal || meal.userId !== userId) {
            res.status(404).json({ error: "Not found" });
            return;
        }
        await prisma_1.prisma.meal.delete({ where: { id } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
