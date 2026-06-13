import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MessageInputProps {
  onSend: (content: string, agentMode: boolean) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [agentMode, setAgentMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (!content.trim() || disabled) return;
    onSend(content.trim(), agentMode);
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
    <div className="relative flex w-full flex-col p-4 bg-background">
      <div className="relative flex w-full items-end gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 focus-within:ring-1 focus-within:ring-ring">
        <div className="flex flex-col justify-end pb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-md transition-colors ${
                  agentMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setAgentMode(!agentMode)}
                disabled={disabled}
              >
                <Globe className="h-4 w-4" />
                <span className="sr-only">Toggle Agent Mode</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {agentMode ? "Agent Mode: ON (Web Search Enabled)" : "Agent Mode: OFF"}
            </TooltipContent>
          </Tooltip>
        </div>

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={agentMode ? "Ask anything... (Agent Mode enabled)" : "Send a message..."}
          className="min-h-[24px] max-h-[200px] w-full resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 placeholder:text-muted-foreground/70"
          rows={1}
          disabled={disabled}
        />

        <div className="flex flex-col justify-end pb-1">
          <Button
            size="icon"
            className="h-8 w-8 rounded-md transition-all"
            onClick={handleSend}
            disabled={!content.trim() || disabled}
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send Message</span>
          </Button>
        </div>
      </div>
      <div className="text-center mt-2">
        <span className="text-[10px] text-muted-foreground">
          NexChat can make mistakes. Consider verifying important information.
        </span>
      </div>
    </div>
  );
}
