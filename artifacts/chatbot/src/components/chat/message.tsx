import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy, User, Bot, ChevronRight, ChevronDown, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { OpenrouterMessage } from "@workspace/api-client-react/src/generated/api.schemas";

interface MessageProps {
  message: OpenrouterMessage;
  isStreaming?: boolean;
  thoughts?: string;
  onQuickSend?: (text: string) => void;
}

interface ClarifyData {
  question: string;
  suggestions: string[];
  defaultVal: string;
}

function parseClarify(content: string): { before: string; clarify: ClarifyData | null; after: string } {
  const tagMatch = content.match(/<NexClarify\s+question="([^"]+)"\s+suggestions="([^"]+)"\s+default="([^"]+)"\s*\/>/);
  if (!tagMatch) return { before: content, clarify: null, after: "" };
  const idx = content.indexOf(tagMatch[0]);
  return {
    before: content.slice(0, idx).trim(),
    clarify: {
      question: tagMatch[1],
      suggestions: tagMatch[2].split(",").map(s => s.trim()),
      defaultVal: tagMatch[3].trim(),
    },
    after: content.slice(idx + tagMatch[0].length).trim(),
  };
}

function ClarifyCard({ clarify, onSend, disabled }: { clarify: ClarifyData; onSend?: (text: string) => void; disabled?: boolean }) {
  const [selected, setSelected] = useState(clarify.defaultVal);
  const [custom, setCustom] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (submitted || disabled) return;
    const value = custom.trim() || selected;
    setSubmitted(true);
    onSend?.(value);
  };

  const displaySuggestions = clarify.suggestions.includes(clarify.defaultVal)
    ? clarify.suggestions
    : [clarify.defaultVal, ...clarify.suggestions];

  return (
    <div className="mt-3 rounded-xl border border-border bg-background shadow-sm overflow-hidden max-w-lg">
      <div className="px-4 pt-4 pb-3">
        <p className="text-sm font-medium text-foreground mb-3">{clarify.question}</p>
        <div className="flex flex-wrap gap-2">
          {displaySuggestions.map((opt) => {
            const isSelected = selected === opt && !custom;
            return (
              <button
                key={opt}
                onClick={() => { if (!submitted) { setSelected(opt); setCustom(""); } }}
                disabled={submitted}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all
                  ${isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  } ${submitted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {isSelected && <Check className="h-3 w-3" />}
                {opt}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2 items-center">
          <input
            type="text"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            disabled={submitted}
            placeholder="Or type a custom value..."
            className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitted}
            className="h-8 px-4 text-xs rounded-md"
          >
            {submitted ? <Check className="h-3.5 w-3.5" /> : "Confirm"}
          </Button>
        </div>
      </div>
      {submitted && (
        <div className="px-4 py-2 bg-muted/20 border-t border-border text-xs text-muted-foreground">
          ✓ Sent: <span className="text-foreground font-medium">{custom.trim() || selected}</span>
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message, isStreaming, thoughts, onQuickSend }: MessageProps) {
  const isUser = message.role === "user";
  const [thoughtsOpen, setThoughtsOpen] = useState(false);

  const { before, clarify, after } = parseClarify(message.content);

  return (
    <div
      className={`group relative flex gap-4 px-4 py-6 text-sm md:gap-6 md:px-6 md:py-8 ${
        isUser ? "bg-background" : "bg-muted/30"
      }`}
    >
      <div className="flex shrink-0 flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md border ${
            isUser
              ? "bg-background border-border text-muted-foreground"
              : "bg-primary border-primary text-primary-foreground shadow-sm"
          }`}
        >
          {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {isUser ? "You" : "NexChat"}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), "HH:mm")}
          </span>
          {message.model && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">
              {message.model === "nex-agi/nex-n2-pro:free"
                ? "Nex N2 Pro"
                : message.model === "nvidia/nemotron-3-ultra-550b-a55b:free"
                ? "Nemotron Ultra"
                : message.model}
            </span>
          )}
        </div>

        {thoughts && (
          <div className="mb-2 rounded-xl border border-border/60 bg-zinc-900/80 overflow-hidden">
            <button
              onClick={() => setThoughtsOpen((o) => !o)}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
                <Lightbulb className="h-4 w-4" />
              </div>
              <span className="flex-1 text-left font-medium text-foreground/90">Think</span>
              {thoughtsOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>

            {thoughtsOpen && (
              <div className="border-t border-border/40 px-4 py-3">
                <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-muted-foreground/85 max-h-[320px] overflow-y-auto">
                  {thoughts}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none break-words">
          {before && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
              {before}
            </ReactMarkdown>
          )}

          {clarify && (
            <ClarifyCard
              clarify={clarify}
              onSend={onQuickSend}
              disabled={isStreaming}
            />
          )}

          {after && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
              {after}
            </ReactMarkdown>
          )}

          {!clarify && !before && !after && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
              {message.content}
            </ReactMarkdown>
          )}

          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ node, inline, className, children, ...props }: any) {
  const match = /language-(\w+)/.exec(className || "");
  const codeString = String(children).replace(/\n$/, "");
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative my-4 overflow-hidden rounded-md border bg-zinc-950">
        <div className="flex items-center justify-between bg-zinc-900 px-4 py-1.5 text-xs text-zinc-400">
          <span>{match[1].toLowerCase() === "mql5" ? "MQL5" : match[1]}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-zinc-100 transition-colors"
            title="Copy"
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
        <SyntaxHighlighter
          {...props}
          style={atomDark}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: "1rem", backgroundColor: "transparent" }}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    );
  }
  return (
    <code className={`${className} bg-muted px-1.5 py-0.5 rounded-sm font-mono text-[0.875em]`} {...props}>
      {children}
    </code>
  );
}
