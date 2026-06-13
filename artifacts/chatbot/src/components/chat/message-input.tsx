import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (!content.trim() || disabled) return;
    onSend(content.trim());
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative flex w-full flex-col">
      <div className="relative flex w-full items-end gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.24)] transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-ring/30">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a strategy, market, backtest, or MQL5..."
          className="min-h-[28px] max-h-[200px] w-full resize-none border-0 bg-transparent p-0 py-1 text-sm leading-5 focus-visible:ring-0 placeholder:text-muted-foreground/60"
          rows={1}
          disabled={disabled}
        />

        <div className="flex flex-col justify-end">
          <Button
            size="icon"
            className="h-9 w-9 rounded-md transition-colors"
            onClick={handleSend}
            disabled={!content.trim() || disabled}
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
            <span className="sr-only">Send Message</span>
          </Button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-muted-foreground/70">
        <span>Enter to send, Shift + Enter for a new line</span>
        <span className="hidden sm:inline">Verify important market information</span>
      </div>
    </div>
  );
}
