import { Router, type IRouter } from "express";
import { execFile } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";

const router: IRouter = Router();

router.post("/execute/python", async (req, res): Promise<void> => {
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== "string" || !code.trim()) {
    res.status(400).json({ error: "code is required" });
    return;
  }

  if (code.length > 50_000) {
    res.status(400).json({ error: "Code too large (50KB max)" });
    return;
  }

  const filename = join(tmpdir(), `nexchat_${randomBytes(8).toString("hex")}.py`);

  try {
    await writeFile(filename, code, "utf8");

    const result = await new Promise<{ output: string; error: string; exitCode: number }>(
      (resolve) => {
        execFile(
          "python3",
          [filename],
          { timeout: 12_000, maxBuffer: 512 * 1024 },
          (err, stdout, stderr) => {
            const exitCode = err?.code != null ? (typeof err.code === "number" ? err.code : 1) : 0;
            const timedOut = (err as any)?.killed || (err as any)?.signal === "SIGTERM";
            resolve({
              output: stdout ?? "",
              error: timedOut ? "⏱ Execution timed out (12s limit)" : (stderr ?? err?.message ?? ""),
              exitCode: timedOut ? 124 : exitCode,
            });
          }
        );
      }
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Python execution failed");
    res.status(500).json({ error: "Execution failed", output: "", exitCode: 1 });
  } finally {
    unlink(filename).catch(() => {});
  }
});

export default router;
