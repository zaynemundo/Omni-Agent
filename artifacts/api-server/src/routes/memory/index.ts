import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, memories } from "@workspace/db";

const router: IRouter = Router();

router.get("/memory", async (_req, res): Promise<void> => {
  const rows = await db.select().from(memories).orderBy(memories.key);
  res.json(rows);
});

router.put("/memory/:key", async (req, res): Promise<void> => {
  const key = req.params.key;
  const { value } = req.body as { value?: string };
  if (!key || typeof value !== "string" || !value.trim()) {
    res.status(400).json({ error: "key and value are required" });
    return;
  }

  const [row] = await db
    .insert(memories)
    .values({ key, value })
    .onConflictDoUpdate({
      target: memories.key,
      set: { value, updatedAt: new Date() },
    })
    .returning();

  res.json(row);
});

router.delete("/memory/:key", async (req, res): Promise<void> => {
  const key = req.params.key;
  const [deleted] = await db
    .delete(memories)
    .where(eq(memories.key, key))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Memory key not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
