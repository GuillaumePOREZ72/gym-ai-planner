"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const CreateProfileSchema = zod_1.z.object({
    goal: zod_1.z.enum(["bulk", "cut", "recomp", "strength", "endurance"]),
    experience: zod_1.z.enum(["beginner", "intermediate", "advanced"]),
    daysPerWeek: zod_1.z.number().int().min(1).max(7),
    sessionLength: zod_1.z.number().int().min(15).max(240),
    equipment: zod_1.z.enum(["full_gym", "home", "dumbbells"]),
    preferredSplit: zod_1.z.enum(["full", "upper_lower", "push_pull", "chest_back", "legs_arms"]),
    injuries: zod_1.z.string().max(500).nullable().optional(),
});
const router = (0, express_1.Router)();
router.get("/", async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const profile = await prisma_1.prisma.userProfiles.findUnique({ where: { userId } });
        res.json({ profile });
    }
    catch (err) {
        next(err);
    }
});
router.post("/", async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const parsed = CreateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten().fieldErrors });
        return;
    }
    const { goal, experience, daysPerWeek, sessionLength, equipment, preferredSplit, injuries } = parsed.data;
    try {
        const profile = await prisma_1.prisma.userProfiles.upsert({
            where: { userId },
            update: { goal, experience, daysPerWeek, sessionLength, equipment, preferredSplit, injuries: injuries ?? null },
            create: { userId, goal, experience, daysPerWeek, sessionLength, equipment, preferredSplit, injuries: injuries ?? null },
        });
        // Return full record so client confirms persistence before generating plan
        res.json({ profile });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
