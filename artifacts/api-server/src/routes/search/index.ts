import { Router, type IRouter } from "express";
import { SearchWebBody, FetchPageBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function searchSerper(
  query: string,
  maxResults: number
): Promise<{ title: string; url: string; snippet: string }[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY not set");

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: maxResults }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Serper responded with ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    organic?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
    }>;
    answerBox?: { answer?: string; title?: string; link?: string };
    knowledgeGraph?: { title?: string; description?: string; website?: string };
  };

  const results: { title: string; url: string; snippet: string }[] = [];

  if (data.answerBox?.answer && data.answerBox?.link) {
    results.push({
      title: data.answerBox.title ?? query,
      url: data.answerBox.link,
      snippet: data.answerBox.answer,
    });
  }

  for (const item of data.organic ?? []) {
    if (results.length >= maxResults) break;
    if (item.title && item.link && item.snippet) {
      results.push({ title: item.title, url: item.link, snippet: item.snippet });
    }
  }

  return results;
}

async function searchDuckDuckGo(
  query: string,
  maxResults: number
): Promise<{ title: string; url: string; snippet: string }[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;

  const response = await fetch(url, {
    headers: { "User-Agent": "AI-Chatbot-Agent/1.0" },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) throw new Error(`DuckDuckGo responded with ${response.status}`);

  const data = (await response.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    AbstractSource?: string;
    RelatedTopics?: Array<{
      Text?: string;
      FirstURL?: string;
      Name?: string;
      Topics?: Array<{ Text?: string; FirstURL?: string }>;
    }>;
  };

  const results: { title: string; url: string; snippet: string }[] = [];

  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.AbstractSource ?? query,
      url: data.AbstractURL,
      snippet: data.AbstractText,
    });
  }

  for (const topic of data.RelatedTopics ?? []) {
    if (results.length >= maxResults) break;
    if (topic.Text && topic.FirstURL) {
      results.push({
        title: topic.Name ?? topic.Text.split(" - ")[0] ?? query,
        url: topic.FirstURL,
        snippet: topic.Text,
      });
    } else if (topic.Topics) {
      for (const sub of topic.Topics) {
        if (results.length >= maxResults) break;
        if (sub.Text && sub.FirstURL) {
          results.push({
            title: sub.Text.split(" - ")[0] ?? query,
            url: sub.FirstURL,
            snippet: sub.Text,
          });
        }
      }
    }
  }

  return results;
}

router.post("/search/web", async (req, res): Promise<void> => {
  const parsed = SearchWebBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, maxResults = 8 } = parsed.data;

  try {
    let results: { title: string; url: string; snippet: string }[] = [];
    let provider = "serper";

    try {
      results = await searchSerper(query, maxResults);
      req.log.info({ provider: "serper", count: results.length }, "Search completed");
    } catch (serperErr) {
      req.log.warn({ err: serperErr }, "Serper search failed, falling back to DuckDuckGo");
      provider = "duckduckgo";
      results = await searchDuckDuckGo(query, maxResults);
      req.log.info({ provider: "duckduckgo", count: results.length }, "Fallback search completed");
    }

    res.json({ query, results, provider });
  } catch (err) {
    req.log.error({ err }, "All search providers failed");
    res.status(500).json({ error: "Search failed" });
  }
});

router.post("/search/fetch", async (req, res): Promise<void> => {
  const parsed = FetchPageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url } = parsed.data;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI-Chatbot-Agent/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`Page responded with ${response.status}`);

    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (text.length > 8000) text = text.slice(0, 8000) + "…";

    res.json({ url, title, content: text });
  } catch (err) {
    req.log.error({ err }, "Page fetch failed");
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

export default router;
