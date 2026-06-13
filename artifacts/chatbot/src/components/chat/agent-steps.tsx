import { useState } from "react";
import { Lightbulb, Bot, ChevronRight, ChevronDown, CheckCircle2 } from "lucide-react";

interface AgentStepsProps {
  phase: "idle" | "researching" | "generating";
  researchContent: string;
}

export function AgentSteps({ phase, researchContent }: AgentStepsProps) {
  const [thinkOpen, setThinkOpen] = useState(true);

  if (phase === "idle") return null;

  const researchDone = phase === "generating";
  const stepNum = researchContent ? (researchDone ? 2 : 1) : 1;
  const totalSteps = researchContent || phase === "researching" ? 2 : 1;

  return (
    <div className="mb-4 space-y-2 max-w-2xl">
      {(phase === "researching" || researchContent) && (
        <div className="rounded-xl border border-border/60 bg-zinc-900/80 overflow-hidden">
          <button
            className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
            onClick={() => setThinkOpen((o) => !o)}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
              <Lightbulb className="h-4 w-4" />
            </div>
            <span className="flex-1 text-left font-medium text-foreground/90">
              {phase === "researching" ? "Thinking" : "Think"}
            </span>
            <div className="flex items-center gap-2">
              {phase === "researching" && (
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:240ms]" />
                </span>
              )}
              {researchDone && <CheckCircle2 className="h-4 w-4 text-green-500/70" />}
              {thinkOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>

          {thinkOpen && researchContent && (
            <div className="border-t border-border/40 px-4 py-3">
              <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-muted-foreground/85 max-h-[280px] overflow-y-auto">
                {researchContent}
                {phase === "researching" && (
                  <span className="inline-block h-3 w-1.5 animate-pulse bg-amber-400 align-middle ml-0.5" />
                )}
              </pre>
            </div>
          )}

          {thinkOpen && phase === "researching" && !researchContent && (
            <div className="border-t border-border/40 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:240ms]" />
                </span>
                Nemotron Ultra is analyzing your request...
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "generating" && (
        <div className="rounded-xl border border-border/60 bg-zinc-900/80 overflow-hidden">
          <div className="flex w-full items-center gap-3 px-4 py-3 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <span className="flex-1 font-medium text-foreground/90">Writing response</span>
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:240ms]" />
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-1 pt-0.5">
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i < stepNum
                  ? "w-8 bg-primary"
                  : "w-4 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">
          Step {stepNum}/{totalSteps} ·{" "}
          {phase === "researching"
            ? "Nemotron Ultra researching"
            : "Nex N2 Pro writing"}
        </span>
      </div>
    </div>
  );
}
