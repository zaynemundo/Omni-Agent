import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import {
  GetOpenrouterConversationParams,
  DeleteOpenrouterConversationParams,
  RenameOpenrouterConversationParams,
  RenameOpenrouterConversationBody,
  ListOpenrouterMessagesParams,
  SendOpenrouterMessageParams,
  SendOpenrouterMessageBody,
  CreateOpenrouterConversationBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const RESEARCHER_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const CODER_MODEL = "nex-agi/nex-n2-pro:free";

const AVAILABLE_MODELS = [
  {
    id: CODER_MODEL,
    name: "Nex N2 Pro",
    description: "Advanced reasoning model by Nex AGI — code & execution",
    isFree: true,
  },
  {
    id: RESEARCHER_MODEL,
    name: "Nemotron 3 Ultra",
    description: "NVIDIA's 550B ultra-large model — research & analysis",
    isFree: true,
  },
];

router.get("/openrouter/models", async (_req, res): Promise<void> => {
  res.json(AVAILABLE_MODELS);
});

router.get("/openrouter/conversations", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(conversations.createdAt);
  res.json(rows);
});

router.post("/openrouter/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenrouterConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db
    .insert(conversations)
    .values({ title: parsed.data.title })
    .returning();
  res.status(201).json(conv);
});

router.get("/openrouter/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenrouterConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/openrouter/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenrouterConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(conversations)
    .where(eq(conversations.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.patch("/openrouter/conversations/:id", async (req, res): Promise<void> => {
  const params = RenameOpenrouterConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = RenameOpenrouterConversationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [updated] = await db
    .update(conversations)
    .set({ title: body.data.title })
    .where(eq(conversations.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json(updated);
});

router.get("/openrouter/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenrouterMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/openrouter/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenrouterMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SendOpenrouterMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const conversationId = params.data.id;
  const { content } = body.data;

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId,
    role: "user",
    content,
    model: null,
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // ── Phase 1: Nemotron Ultra researches ──────────────────────────────────
    send({ phase: "researching", agent: "Nemotron Ultra" });

    const researchMessages: { role: "user" | "assistant" | "system"; content: string }[] = [
      {
        role: "system",
        content: `You are a highly capable research analyst specializing in trading, finance, MQL5/MetaTrader 5, and technical analysis. Your job is to analyze the user's request and provide concise, accurate research findings that will help another AI write the best possible response or code.

Today's date: ${new Date().toISOString().split("T")[0]}.

Focus on:
- Key technical concepts relevant to the request
- Best practices, important considerations, known pitfalls
- For trading strategies: known edge cases, risk parameters, indicator behavior
- For MQL5/MT5: relevant functions, syntax patterns, common EA structure
- For backtesting: realistic assumptions, slippage, spread impact

Be concise and structured. Output 3-7 bullet points of the most actionable findings. Do NOT write any final answer or code yourself — only research notes.`,
      },
      {
        role: "user",
        content: `Research request: "${content}"\n\nProvide research findings only — no final answer, no code. Bullet points of key insights.`,
      },
    ];

    let researchOutput = "";
    const researchStream = await openrouter.chat.completions.create({
      model: RESEARCHER_MODEL,
      max_tokens: 2048,
      messages: researchMessages,
      stream: true,
    });

    for await (const chunk of researchStream) {
      const chunkContent = chunk.choices[0]?.delta?.content;
      if (chunkContent) {
        researchOutput += chunkContent;
        send({ phase: "research_chunk", content: chunkContent });
      }
    }

    // ── Phase 2: Nex N2 Pro generates the final response ──────────────────
    send({ phase: "generating", agent: "Nex N2 Pro" });

    const coderSystemPrompt = `You are Nex N2 Pro, a highly capable AI assistant specializing in trading, algorithmic strategies, MQL5/MetaTrader 5 Expert Advisor development, and quantitative analysis. You have been given research findings from Nemotron Ultra (your research partner) to help you craft the best possible response.

Today's date: ${new Date().toISOString().split("T")[0]}.

Your capabilities:
- Write production-ready MQL5 Expert Advisors for MetaTrader 5
- Design and explain trading strategies (XAUUSD, Forex, indices, crypto)
- Explain strategy logic and risk management
- Interpret backtest results from the built-in strategy simulator
- Write clean, well-commented, copy-paste-ready code

MQL5 code guidelines:
- Always wrap code in \`\`\`mql5 code blocks
- Include proper #property headers
- Use OnInit(), OnDeinit(), OnTick() standard structure
- Handle errors gracefully
- Add meaningful comments
- Respect user's SL/TP preferences (if user says no SL, omit it)

Research findings from Nemotron Ultra:
---
${researchOutput}
---`;

    const coderMessages: { role: "user" | "assistant" | "system"; content: string }[] = [
      { role: "system", content: coderSystemPrompt },
    ];

    for (const msg of history) {
      coderMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    let fullResponse = "";
    const coderStream = await openrouter.chat.completions.create({
      model: CODER_MODEL,
      max_tokens: 8192,
      messages: coderMessages,
      stream: true,
    });

    for await (const chunk of coderStream) {
      const chunkContent = chunk.choices[0]?.delta?.content;
      if (chunkContent) {
        fullResponse += chunkContent;
        send({ content: chunkContent });
      }
    }

    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
      model: CODER_MODEL,
    });

    if (conv.title === "New Conversation" || conv.title.startsWith("New Conversation")) {
      const firstUserMsg = content.slice(0, 60);
      await db
        .update(conversations)
        .set({ title: firstUserMsg + (content.length > 60 ? "…" : "") })
        .where(eq(conversations.id, conversationId));
    }

    send({ done: true });
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error in dual-agent pipeline");
    send({ error: "Failed to get AI response. Please try again." });
    res.end();
  }
});

export default router;
