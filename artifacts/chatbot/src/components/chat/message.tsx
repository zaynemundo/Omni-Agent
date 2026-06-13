import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy, User, Bot, Globe } from "lucide-react";
import { format } from "date-fns";
import type { OpenrouterMessage } from "@workspace/api-client-react/src/generated/api.schemas";

interface MessageProps {
  message: OpenrouterMessage;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: MessageProps) {
  const isUser = message.role === "user";
  
  return (
    <div
      className={`group relative flex gap-4 px-4 py-6 text-sm md:gap-6 md:px-6 md:py-8 ${
        isUser ? "bg-background" : "bg-muted/30"
      }`}
    >
      <div className="flex shrink-0 flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md border ${
            isUser ? "bg-background border-border text-muted-foreground" : "bg-primary border-primary text-primary-foreground shadow-sm"
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
              {message.model}
            </span>
          )}
        </div>
        
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
                        <span>{match[1]}</span>
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-1 hover:text-zinc-100 transition-colors"
                        >
                          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {isCopied ? "Copied!" : "Copy"}
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
                  <code className={`${className} bg-muted px-1.5 py-0.5 rounded-sm font-mono text-[0.875em]`} {...props}>
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
