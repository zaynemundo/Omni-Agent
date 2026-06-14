import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  hero?: boolean;
}

export function MessageInput({ onSend, disabled, hero = false }: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(hero ? 76 : 28, Math.min(textareaRef.current.scrollHeight, 200))}px`;
    }
  }, [content, hero]);

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
      <div className={`relative flex w-full items-end gap-3 border bg-card px-4 shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-colors focus-within:border-ring/60 ${
        hero ? "min-h-32 rounded-lg border-border py-4" : "rounded-lg border-transparent py-3"
      }`}>
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hero ? "Ask about markets, strategies, or MQL5" : "Message NexChat"}
          className={`${hero ? "min-h-[76px] text-base" : "min-h-[28px] text-sm"} max-h-[200px] w-full resize-none border-0 bg-transparent p-0 py-1 leading-5 focus-visible:ring-0 placeholder:text-muted-foreground/60`}
          rows={1}
          disabled={disabled}
        />

        <div className="flex flex-col justify-end">
          <Button
            size="icon"
            className="h-8 w-8 rounded-full bg-foreground text-background transition-colors hover:bg-foreground/85"
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
      <div className="mt-2 text-center text-[10px] text-muted-foreground/70">
        NexChat can make mistakes. Check important information.
      </div>
    </div>
  );
}
