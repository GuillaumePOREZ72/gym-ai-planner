import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { generateMealInsight } from "../lib/ai";

const router = Router();

// GET /api/meals — list meals for the authenticated user
router.get("/", async (req: Request, res: Response) => {
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
  } catch {
    res.status(500).json({ error: "Failed to fetch meals" });
  }
});

// POST /api/meals — create a meal and generate AI insight
router.post("/", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { date, name, calories, protein, carbs, fat } = req.body as {
    date: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  if (!date.trim() || !name.trim() || calories == null || protein == null || carbs == null || fat == null ||
      isNaN(Number(calories)) || isNaN(Number(protein)) || isNaN(Number(carbs)) || isNaN(Number(fat))) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  let aiInsight: string | undefined;
  try {
    aiInsight = await generateMealInsight({
      name,
      calories: Number(calories),
      protein: Number(protein),
      carbs: Number(carbs),
      fat: Number(fat),
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
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
        aiInsight,
      },
    });
    res.status(201).json({ meal });
  } catch {
    res.status(500).json({ error: "Failed to create meal" });
  }
});

// DELETE /api/meals/:id
router.delete("/:id", async (req: Request, res: Response) => {
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
  } catch {
    res.status(500).json({ error: "Failed to delete meal" });
  }
});

export default router;
