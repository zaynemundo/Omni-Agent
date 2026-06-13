import { useState } from "react";
import { Lightbulb, Bot, ChevronRight, ChevronDown, CheckCircle2, Search, Code2, MessageCircle } from "lucide-react";

export type AgentMode = "general" | "code" | "research";
export type StreamPhase = "idle" | "searching" | "researching" | "generating";

interface AgentStepsProps {
  phase: StreamPhase;
  researchContent: string;
  agentMode?: AgentMode;
  searchCount?: number;
}

const AGENT_LABELS: Record<AgentMode, { name: string; icon: typeof Bot }> = {
  general: { name: "General Agent", icon: MessageCircle },
  code: { name: "Code Agent", icon: Code2 },
  research: { name: "Research Agent", icon: Search },
};

export function AgentSteps({ phase, researchContent, agentMode = "general", searchCount = 3 }: AgentStepsProps) {
  const [thinkOpen, setThinkOpen] = useState(true);

  if (phase === "idle") return null;

  const isResearchMode = agentMode === "research";
  const hasSearch = isResearchMode && (phase === "searching" || phase === "researching" || phase === "generating");
  const hasResearch = isResearchMode && (phase === "researching" || (phase === "generating" && researchContent));
  const searchDone = isResearchMode && (phase === "researching" || phase === "generating");
  const researchDone = phase === "generating";

  const totalSteps = isResearchMode ? 3 : 1;
  const stepNum = phase === "searching" ? 1 : phase === "researching" ? 2 : 3;

  const agentLabel = AGENT_LABELS[agentMode];

  return (
    <div className="mb-4 space-y-2 max-w-2xl">
      {/* Search step (Research Agent only) */}
      {hasSearch && (
        <div className="rounded-xl border border-border/60 bg-zinc-900/80 overflow-hidden">
          <div className="flex w-full items-center gap-3 px-4 py-3 text-sm">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
              searchDone ? "bg-green-500/15 text-green-400" : "bg-blue-500/15 text-blue-400"
            }`}>
              <Search className="h-4 w-4" />
            </div>
            <span className="flex-1 font-medium text-foreground/90">
              {searchDone
                ? `Searched ${searchCount} quer${searchCount === 1 ? "y" : "ies"} in parallel`
                : `Searching ${searchCount} quer${searchCount === 1 ? "y" : "ies"} in parallel`}
            </span>
            <div className="flex items-center gap-2">
              {!searchDone && (
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:240ms]" />
                </span>
              )}
              {searchDone && <CheckCircle2 className="h-4 w-4 text-green-500/70" />}
            </div>
          </div>
        </div>
      )}

      {/* Research / Think step (Research Agent only) */}
      {hasResearch && (
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
                Nemotron Ultra analyzing search results...
              </div>
            </div>
          )}
        </div>
      )}

      {/* Writing response step */}
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

      {/* Progress bar */}
      <div className="flex items-center gap-2 px-1 pt-0.5">
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i < stepNum ? "w-8 bg-primary" : "w-4 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <agentLabel.icon className="h-2.5 w-2.5" />
          {agentLabel.name} ·{" "}
          {phase === "searching"
            ? "Searching web"
            : phase === "researching"
            ? "Analyzing sources"
            : "Generating response"}
        </span>
      </div>
    </div>
  );
}
