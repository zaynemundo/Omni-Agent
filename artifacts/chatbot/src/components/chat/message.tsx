import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy, User, Bot, ChevronRight, FlaskConical } from "lucide-react";
import { format } from "date-fns";
import type { OpenrouterMessage } from "@workspace/api-client-react/src/generated/api.schemas";

interface MessageProps {
  message: OpenrouterMessage;
  isStreaming?: boolean;
  thoughts?: string;
}

export function ChatMessage({ message, isStreaming, thoughts }: MessageProps) {
  const isUser = message.role === "user";
  const [thoughtsOpen, setThoughtsOpen] = useState(false);

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
          <div className="mb-1 rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
            <button
              onClick={() => setThoughtsOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <ChevronRight
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                  thoughtsOpen ? "rotate-90" : ""
                }`}
              />
              <FlaskConical className="h-3.5 w-3.5 shrink-0 text-blue-400" />
              <span className="font-medium">
                {isStreaming && !thoughtsOpen
                  ? "Nemotron Ultra is researching…"
                  : "Nemotron Ultra's research"}
              </span>
              {isStreaming && (
                <span className="ml-auto flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </button>

            {thoughtsOpen && (
              <div className="border-t border-border/40 px-3 py-3">
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground/90 max-h-[360px] overflow-y-auto">
                  {thoughts}
                  {isStreaming && (
                    <span className="inline-block h-3 w-1.5 animate-pulse bg-blue-400 align-middle ml-0.5" />
                  )}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
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
                        <span>
                          {match[1].toLowerCase() === "mql5" ? "MQL5" : match[1]}
                        </span>
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
                        customStyle={{
                          margin: 0,
                          padding: "1rem",
                          backgroundColor: "transparent",
                        }}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                }
                return (
                  <code
                    className={`${className} bg-muted px-1.5 py-0.5 rounded-sm font-mono text-[0.875em]`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
