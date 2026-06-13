import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, conversations, messages, memories } from "@workspace/db";
import { groq } from "@workspace/integrations-openrouter-ai";
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

// ── Models ────────────────────────────────────────────────────────────────────
const RESEARCHER_MODEL = "llama-3.3-70b-versatile";
const CODER_MODEL = "llama-3.3-70b-versatile";
const FAST_MODEL = "llama-3.1-8b-instant";

function getAiErrorMessage(err: unknown): string {
  const error = err as { status?: number; message?: string };

  if (error.status === 401) {
    return "Groq rejected the API key. Replace GROQ_API_KEY in Replit Secrets, then restart the app.";
  }
  if (error.status === 403) {
    return "This Groq project does not have permission to use the selected model.";
  }
  if (error.status === 429) {
    return "Groq's free-tier rate limit has been reached. Wait briefly and try again.";
  }
  if (error.status === 404 || error.message?.toLowerCase().includes("model")) {
    return "The configured Groq model is unavailable. Check the model settings and try again.";
  }

  return "Groq could not generate a response. Check the Replit console for details.";
}

// ── Search Cache (5-minute TTL) ───────────────────────────────────────────────
interface CacheEntry {
  results: { title: string; url: string; snippet: string }[];
  ts: number;
}
const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function cachedSearch(
  query: string,
  maxResults = 6
): Promise<{ title: string; url: string; snippet: string }[]> {
  const key = `${query}::${maxResults}`;
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.results;

  const serperKey = process.env.SERPER_API_KEY;
  let results: { title: string; url: string; snippet: string }[] = [];

  if (serperKey) {
    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: maxResults }),
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) {
        const data = (await r.json()) as {
          organic?: Array<{ title?: string; link?: string; snippet?: string }>;
          answerBox?: { answer?: string; title?: string; link?: string };
        };
        if (data.answerBox?.answer && data.answerBox?.link) {
          results.push({ title: data.answerBox.title ?? query, url: data.answerBox.link, snippet: data.answerBox.answer });
        }
        for (const item of data.organic ?? []) {
          if (results.length >= maxResults) break;
          if (item.title && item.link && item.snippet) {
            results.push({ title: item.title, url: item.link, snippet: item.snippet });
          }
        }
      }
    } catch { /* fall through to DDG */ }
  }

  if (results.length === 0) {
    try {
      const r = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`,
        { headers: { "User-Agent": "NexChat/1.0" }, signal: AbortSignal.timeout(6000) }
      );
      if (r.ok) {
        const data = (await r.json()) as {
          AbstractText?: string; AbstractURL?: string; AbstractSource?: string;
          RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
        };
        if (data.AbstractText && data.AbstractURL) {
          results.push({ title: data.AbstractSource ?? query, url: data.AbstractURL, snippet: data.AbstractText });
        }
        for (const t of data.RelatedTopics ?? []) {
          if (results.length >= maxResults) break;
          if (t.Text && t.FirstURL) results.push({ title: t.Text.split(" - ")[0] ?? query, url: t.FirstURL, snippet: t.Text });
          for (const s of t.Topics ?? []) {
            if (results.length >= maxResults) break;
            if (s.Text && s.FirstURL) results.push({ title: s.Text.split(" - ")[0] ?? query, url: s.FirstURL, snippet: s.Text });
          }
        }
      }
    } catch { /* ignore */ }
  }

  searchCache.set(key, { results, ts: Date.now() });
  return results;
}

// ── Parallel search: derive queries and run simultaneously ────────────────────
function deriveSearchQueries(content: string): string[] {
  const base = content.slice(0, 120).trim();
  const queries: string[] = [base];

  const symbolMatch = content.match(/\b(xauusd|gold|eurusd|gbpusd|usdjpy|us30|nas100|btcusd|ethusd|silver)\b/i);
  const symbol = symbolMatch?.[0]?.toUpperCase();

  if (/\b(mql5|metatrader|mt5|expert advisor|ea)\b/i.test(content)) {
    queries.push(`MQL5 MetaTrader 5 ${content.slice(0, 60)} guide`);
  } else if (symbol) {
    queries.push(`${symbol} trading strategy best practices`);
    queries.push(`${symbol} technical analysis ${new Date().getFullYear()}`);
  } else if (/\b(strategy|backtest|trading|forex)\b/i.test(content)) {
    queries.push(`${content.slice(0, 60)} forex trading guide`);
    queries.push(`${content.slice(0, 50)} risk management tips`);
  } else {
    queries.push(`${content.slice(0, 60)} explained`);
  }

  return [...new Set(queries)].slice(0, 3);
}

async function parallelSearch(
  queries: string[]
): Promise<{ query: string; results: { title: string; url: string; snippet: string }[] }[]> {
  const settled = await Promise.allSettled(
    queries.map((q) => cachedSearch(q, 5).then((results) => ({ query: q, results })))
  );
  return settled
    .filter((s): s is PromiseFulfilledResult<{ query: string; results: { title: string; url: string; snippet: string }[] }> => s.status === "fulfilled")
    .map((s) => s.value);
}

function formatSearchResults(
  batches: { query: string; results: { title: string; url: string; snippet: string }[] }[]
): string {
  const lines: string[] = [];
  for (const { query, results } of batches) {
    if (results.length === 0) continue;
    lines.push(`### Search: "${query}"`);
    for (const r of results) {
      lines.push(`**${r.title}** (${r.url})\n${r.snippet}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ── 3-Agent intent classifier ─────────────────────────────────────────────────
type AgentMode = "general" | "code" | "research";

function classifyAgent(content: string): AgentMode {
  const text = content.trim().toLowerCase();
  const wordCount = text.split(/\s+/).length;

  // Very short / conversational → general
  if (wordCount <= 4) return "general";
  const conversationalPats = [
    /^(hi|hello|hey|sup|yo|howdy|greetings)\b/,
    /^(thanks|thank you|thx|ty|ok|okay|sure|cool|great|nice|perfect|got it|understood|alright)\b/,
    /^(yes|no|yep|nope|nah|yeah)\b/,
    /^(what('?s| is) (your name|this|that|nexchat))\b/,
    /^(who are you|what can you do)\b/,
  ];
  if (conversationalPats.some((p) => p.test(text))) return "general";

  // Code generation signals → code agent
  const codePats = [
    /\b(write|create|build|implement|generate|make|code|develop|program)\b.*\b(ea|expert advisor|mql5|script|indicator|bot|function|algorithm)\b/,
    /\b(mql5|metatrader|mt5|\.mq5)\b/,
    /\b(fix|debug|refactor|improve|optimize)\b.*\b(code|ea|script|function|bug)\b/,
    /\b(ontic|ontick|oninit|ondeinit|ctrade|cposition)\b/i,
    /```[\s\S]*```/,
    /\b(void |double |int |string |bool )\w/,
  ];
  if (codePats.some((p) => p.test(text.length > 10 ? text : content))) return "code";

  // Research / analysis signals → research agent (needs web search)
  const researchPats = [
    /\b(explain|analyze|analyse|research|compare|review)\b/,
    /\b(strategy|backtest|trading|forex|xauusd|eurusd|gbpusd|gold|silver|indices)\b/,
    /\b(rsi|moving average|bollinger|macd|ema|sma|stochastic|atr|fibonacci|ichimoku)\b/,
    /\b(pip|lot size|drawdown|profit factor|win rate|risk.reward|spread|slippage)\b/,
    /\b(market|price|trend|support|resistance|breakout|reversal|momentum)\b/,
    /\b(news|current|latest|today|2024|2025|2026)\b/,
    /\b(how does|what is|when to|why does|difference between)\b/,
  ];
  if (researchPats.some((p) => p.test(text))) return "research";

  // Long messages default to research
  if (wordCount > 35) return "research";

  return "general";
}

// ── EA clarification prompt ───────────────────────────────────────────────────
const CLARIFY_INSTRUCTIONS = `
## Clarifying Questions for EA Requests

When the user asks to create/build/make an Expert Advisor (EA) and ANY of these key parameters are missing or unclear, ask for them ONE AT A TIME using the special tag below BEFORE writing any code:

Parameters to gather (in this order if missing):
1. Symbol (e.g. XAUUSD, EURUSD, GBPUSD, USDJPY, US30, NAS100)
2. Timeframe (e.g. M1, M5, M15, M30, H1, H4, D1)
3. Strategy type (e.g. MA Crossover, RSI, Breakout, Scalping, Grid, Hedging)
4. Risk management: Stop Loss in pips (0 = no SL), Take Profit in pips (0 = no TP)
5. Lot size or risk % per trade

Use EXACTLY this XML tag format — one tag per response, nothing after it except a short intro sentence:

<NexClarify question="YOUR QUESTION HERE" suggestions="OPT1,OPT2,OPT3,OPT4" default="BEST_DEFAULT" />

Rules:
- Only ONE <NexClarify> tag per response
- After the tag, do NOT write any more text or code — wait for the user's answer
- If the user has already provided a parameter, skip that question
- If the user's previous reply was a clarify answer (short, looks like a selection), accept it and ask the NEXT missing parameter
- Once ALL required parameters are known (either from the user or your defaults), proceed to write the full EA code WITHOUT asking more questions
- If the user says "just build it" or "use defaults" or similar, use your own best defaults and build immediately

Example first response when user says "create an EA":
Sure! Let me gather a few quick details to build exactly what you need.
<NexClarify question="What symbol should this EA trade?" suggestions="XAUUSD,EURUSD,GBPUSD,USDJPY" default="XAUUSD" />
`;

// ── Memory helpers ────────────────────────────────────────────────────────────
async function loadMemories(): Promise<string> {
  try {
    const rows = await db.select().from(memories).orderBy(memories.key);
    if (rows.length === 0) return "";
    return rows.map((r) => `${r.key}: ${r.value}`).join("\n");
  } catch { return ""; }
}

async function extractAndStoreMemories(userMsg: string, aiReply: string): Promise<void> {
  try {
    const prompt = `Extract any persistent user facts from this exchange (preferred trading symbol, risk tolerance, timeframe, experience level, timezone, etc). Return ONLY a JSON object like {"key": "value"} with at most 3 entries. If nothing worth storing, return {}.

User: ${userMsg.slice(0, 400)}
AI: ${aiReply.slice(0, 400)}`;

    const resp = await groq.chat.completions.create({
      model: FAST_MODEL,
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    });

    const raw = resp.choices[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return;
    const facts = JSON.parse(jsonMatch[0]) as Record<string, string>;
    for (const [k, v] of Object.entries(facts)) {
      if (typeof k === "string" && typeof v === "string" && k.trim() && v.trim()) {
        await db
          .insert(memories)
          .values({ key: k.trim().toLowerCase().replace(/\s+/g, "_"), value: v.trim() })
          .onConflictDoUpdate({
            target: memories.key,
            set: { value: v.trim(), updatedAt: new Date() },
          });
      }
    }
  } catch { /* fire-and-forget, ignore errors */ }
}

// ── REST routes ───────────────────────────────────────────────────────────────

const AVAILABLE_MODELS = [
  { id: CODER_MODEL, name: "Llama 3.3 70B", description: "Groq-hosted model for code, research, and general chat", isFree: true },
  { id: FAST_MODEL, name: "Llama 3.1 8B Instant", description: "Fast Groq-hosted model for lightweight tasks", isFree: true },
];

router.get("/openrouter/models", async (_req, res): Promise<void> => {
  res.json(AVAILABLE_MODELS);
});

router.get("/openrouter/conversations", async (_req, res): Promise<void> => {
  const rows = await db.select().from(conversations).orderBy(conversations.createdAt);
  res.json(rows);
});

router.post("/openrouter/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenrouterConversationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [conv] = await db.insert(conversations).values({ title: parsed.data.title }).returning();
  res.status(201).json(conv);
});

router.get("/openrouter/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenrouterConversationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.data.id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/openrouter/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenrouterConversationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [deleted] = await db.delete(conversations).where(eq(conversations.id, params.data.id)).returning();
  if (!deleted) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.sendStatus(204);
});

router.patch("/openrouter/conversations/:id", async (req, res): Promise<void> => {
  const params = RenameOpenrouterConversationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = RenameOpenrouterConversationBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [updated] = await db.update(conversations).set({ title: body.data.title }).where(eq(conversations.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json(updated);
});

router.get("/openrouter/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenrouterMessagesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);
  res.json(msgs);
});

// ── Main message handler (3-agent SSE pipeline) ───────────────────────────────
router.post("/openrouter/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenrouterMessageParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const body = SendOpenrouterMessageBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const conversationId = params.data.id;
  const { content } = body.data;

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  await db.insert(messages).values({ conversationId, role: "user", content, model: null });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const agentMode = classifyAgent(content);
  send({ phase: "thinking" });
  send({ phase: "agent_mode", mode: agentMode });

  const storedMemories = await loadMemories();
  const memoryBlock = storedMemories
    ? `\n\n## Known user facts\n${storedMemories}`
    : "";

  const today = new Date().toISOString().split("T")[0];

  try {
    let researchOutput = "";
    let searchContext = "";

    // ── Research Agent: parallel search + Nemotron synthesis ────────────────
    if (agentMode === "research") {
      const queries = deriveSearchQueries(content);
      send({ phase: "searching", count: queries.length, queries });

      const searchBatches = await parallelSearch(queries);
      const totalHits = searchBatches.reduce((n, b) => n + b.results.length, 0);
      searchContext = formatSearchResults(searchBatches);

      const flatResults = searchBatches.flatMap((b) => b.results).slice(0, 12);
      send({ phase: "search_results", results: flatResults });
      send({ phase: "searching_done", resultCount: totalHits });
      send({ phase: "researching", agent: "Research Agent" });

      const researchMessages: { role: "user" | "assistant" | "system"; content: string }[] = [
        {
          role: "system",
          content: `You are a research specialist in trading, finance, MQL5/MetaTrader 5, and technical analysis. Analyze the user's request along with the web search results provided and produce concise, structured research findings that will guide the Code Agent's response.

Today: ${today}${memoryBlock}

Focus on:
- Key technical concepts relevant to the request
- Best practices, important considerations, known pitfalls
- For trading strategies: known edge cases, risk parameters, indicator behavior
- For MQL5/MT5: relevant functions, syntax patterns, common EA structure
- For backtesting: realistic assumptions, slippage, spread impact

Output 4-8 bullet points of the most actionable findings. Do NOT write any final answer or code — research notes only.`,
        },
        {
          role: "user",
          content: `Research request: "${content}"\n\n## Web Search Results\n${searchContext || "No results found."}\n\nProvide research findings only — no final answer, no code. Bullet points of key insights.`,
        },
      ];

      const researchStream = await groq.chat.completions.create({
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
    }

    // ── Code / General Agent: Llama generates final response ─────────────────
    const agentName = agentMode === "code" ? "Code Agent" : agentMode === "research" ? "Llama 3.3 70B" : "General Agent";
    send({ phase: "generating", agent: agentName });

    const systemPrompts: Record<AgentMode, string> = {
      research: `You are a highly capable AI assistant specializing in trading, algorithmic strategies, MQL5/MetaTrader 5 Expert Advisor development, and quantitative analysis. You have been given research findings from a research agent and web search results to help craft the best possible response.

Today: ${today}${memoryBlock}

Your capabilities:
- Write production-ready MQL5 Expert Advisors for MetaTrader 5
- Design and explain trading strategies (XAUUSD, Forex, indices, crypto)
- Explain strategy logic and risk management in depth
- Interpret backtest results from the built-in strategy simulator
- Write clean, well-commented, copy-paste-ready code

MQL5 code guidelines:
- Always wrap code in \`\`\`mql5 code blocks
- Include proper #property headers
- Use OnInit(), OnDeinit(), OnTick() standard structure
- Handle errors gracefully with meaningful comments
- Respect user's SL/TP preferences
${CLARIFY_INSTRUCTIONS}
## Research findings:
---
${researchOutput}
---`,

      code: `You are the Code Agent. You specialize in writing production-ready MQL5/MetaTrader 5 Expert Advisors, trading scripts, and custom indicators.

Today: ${today}${memoryBlock}

Guidelines:
- Always wrap MQL5 code in \`\`\`mql5 code blocks
- Include proper #property headers (version, description, etc.)
- Use standard MQL5 structure: OnInit(), OnDeinit(), OnTick()
- Add risk management with proper SL/TP handling
- Write clean, well-commented, copy-paste-ready code
- Handle edge cases: market closed, insufficient margin, spread checks
${CLARIFY_INSTRUCTIONS}`,

      general: `You are a friendly and knowledgeable AI assistant. Respond naturally and concisely. For simple greetings or short questions, keep your reply brief and conversational. For technical topics, be thorough but not verbose.

Today: ${today}${memoryBlock}`,
    };

    const coderMessages: { role: "user" | "assistant" | "system"; content: string }[] = [
      { role: "system", content: systemPrompts[agentMode] },
    ];

    for (const msg of history) {
      coderMessages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }

    let fullResponse = "";
    const maxTokens = agentMode === "general" ? 512 : 8192;

    const coderStream = await groq.chat.completions.create({
      model: CODER_MODEL,
      max_tokens: maxTokens,
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

    if (!fullResponse.trim()) {
      throw new Error("Groq returned an empty response");
    }

    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
      model: `${CODER_MODEL}|${agentMode}`,
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

    // Fire-and-forget memory extraction (only for meaningful exchanges)
    if (agentMode !== "general" && fullResponse.length > 100) {
      extractAndStoreMemories(content, fullResponse).catch(() => {});
    }
  } catch (err) {
    req.log.error({ err }, "Error in agent pipeline");
    const errorMessage = getAiErrorMessage(err);
    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: `**AI service error:** ${errorMessage}`,
      model: `${CODER_MODEL}|${agentMode}`,
    }).catch((dbErr) => req.log.error({ err: dbErr }, "Failed to save AI error message"));
    send({ error: errorMessage });
    res.end();
  }
});

export default router;
