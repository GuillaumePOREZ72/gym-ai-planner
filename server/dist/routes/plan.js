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
const aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "AI plan generation limit reached. Try again in an hour." },
});
router.post("/generate", aiLimiter, async (req, res, next) => {
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
        const { planJson, planText } = await (0, ai_1.generateTrainingPlan)(profile);
        const existing = await prisma_1.prisma.trainingPlans.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        const plan = await prisma_1.prisma.trainingPlans.create({
            data: {
                userId,
                planJson,
                planText,
                version: existing ? existing.version + 1 : 1,
            },
        });
        res.json({ plan });
    }
    catch (err) {
        next(err);
    }
});
router.get("/", async (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const plan = await prisma_1.prisma.trainingPlans.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        res.json({ plan });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
