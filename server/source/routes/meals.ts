import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateMealInsight } from "../lib/ai";

const CreateMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").refine(
    (s) => !isNaN(Date.parse(s)),
    "Date must be a valid calendar date"
  ),
  name: z.string().min(1).max(200),
  calories: z.number().int().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
  fat: z.number().min(0).max(1000),
});

const router = Router();

// GET /api/meals — list meals for the authenticated user
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const meals = await prisma.meal.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });
    res.json({ meals });
  } catch (err) {
    next(err);
  }
});

// POST /api/meals — create a meal and generate AI insight
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const userId: string | undefined = (req as any).userId;
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

  let aiInsight: string | undefined;
  try {
    aiInsight = await generateMealInsight({
      name,
      calories,
      protein,
      carbs,
      fat,
    });
  } catch {
    // Non-fatal: proceed without AI insight
  }

  try {
    const meal = await prisma.meal.create({
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
  } catch (err) {
    next(err);
  }
});

// DELETE /api/meals/:id
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = req.params.id as string;
  try {
    const meal = await prisma.meal.findUnique({ where: { id } });
    if (!meal || meal.userId !== userId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await prisma.meal.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
