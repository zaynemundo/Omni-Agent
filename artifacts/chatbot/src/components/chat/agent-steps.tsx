import { useState } from "react";
import {
  Lightbulb, Bot, ChevronRight, ChevronDown, CheckCircle2,
  Search, Code2, MessageCircle, Brain, BookOpen, Zap,
} from "lucide-react";

export type AgentMode = "general" | "code" | "research";
export type StreamPhase = "idle" | "thinking" | "searching" | "researching" | "generating";

interface AgentStepsProps {
  phase: StreamPhase;
  researchContent: string;
  agentMode?: AgentMode;
  searchCount?: number;
}

const AGENT_META: Record<AgentMode, { label: string; icon: typeof Bot; color: string; dot: string }> = {
  general: { label: "General Agent", icon: MessageCircle, color: "text-slate-400", dot: "bg-slate-400" },
  code:    { label: "Code Agent",    icon: Code2,          color: "text-emerald-400", dot: "bg-emerald-400" },
  research:{ label: "Research Agent",icon: Search,         color: "text-blue-400",   dot: "bg-blue-400"   },
};

interface StepRowProps {
  icon: typeof Bot;
  iconBg: string;
  iconColor: string;
  label: string;
  status: "active" | "done" | "pending";
  dotColor?: string;
  children?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

function StepRow({ icon: Icon, iconBg, iconColor, label, status, dotColor, children, collapsible, defaultOpen }: StepRowProps) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const hasContent = !!children;

  return (
    <div className="rounded-xl border border-border/60 bg-zinc-900/80 overflow-hidden">
      <button
        className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${hasContent && collapsible ? "hover:bg-white/5" : "cursor-default"}`}
        onClick={() => { if (hasContent && collapsible) setOpen((o) => !o); }}
      >
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg} ${iconColor} shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="flex-1 text-left font-medium text-foreground/90">{label}</span>
        <div className="flex items-center gap-2">
          {status === "active" && dotColor && (
            <span className="flex gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor} animate-bounce [animation-delay:0ms]`} />
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor} animate-bounce [animation-delay:120ms]`} />
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor} animate-bounce [animation-delay:240ms]`} />
            </span>
          )}
          {status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500/70" />}
          {hasContent && collapsible && (
            open ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                 : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {hasContent && (!collapsible || open) && (
        <div className="border-t border-border/40 px-4 py-3">{children}</div>
      )}
    </div>
  );
}

export function AgentSteps({ phase, researchContent, agentMode = "general", searchCount = 3 }: AgentStepsProps) {
  if (phase === "idle") return null;

  const meta = AGENT_META[agentMode];
  const isResearch = agentMode === "research";

  // Steps visible per phase
  const showThinking  = phase === "thinking";
  const showSearching = isResearch && (phase === "searching" || phase === "researching" || phase === "generating");
  const showSynth     = isResearch && (phase === "researching" || phase === "generating");
  const showGenerating= phase === "generating";

  const searchDone  = isResearch && (phase === "researching" || phase === "generating");
  const synthDone   = isResearch && phase === "generating";

  // Progress bar
  const totalSteps = isResearch ? 4 : 2;
  const stepIdx    = phase === "thinking" ? 1
                   : phase === "searching" ? 2
                   : phase === "researching" ? 3
                   : 4;

  // Collaboration trail
  const trailItems: string[] = [];
  if (phase !== "thinking") trailItems.push(`Router → ${meta.label}`);
  if (showSearching) trailItems.push(`${searchCount} parallel Serper queries`);
  if (showSynth)     trailItems.push("Nemotron Ultra synthesizing");
  if (showGenerating) trailItems.push(agentMode === "code" ? "Writing code..." : agentMode === "research" ? "Synthesizing answer..." : "Writing response...");

  return (
    <div className="mb-4 space-y-2 max-w-2xl">

      {/* Step 1: Thinking / intent detection */}
      {showThinking && (
        <StepRow
          icon={Brain}
          iconBg="bg-violet-500/15"
          iconColor="text-violet-400"
          label="Analyzing intent..."
          status="active"
          dotColor="bg-violet-400"
        />
      )}

      {/* Step 2: Searching */}
      {showSearching && (
        <StepRow
          icon={Search}
          iconBg={searchDone ? "bg-green-500/15" : "bg-blue-500/15"}
          iconColor={searchDone ? "text-green-400" : "text-blue-400"}
          label={searchDone
            ? `Searched ${searchCount} quer${searchCount === 1 ? "y" : "ies"} in parallel`
            : `Searching web — ${searchCount} parallel quer${searchCount === 1 ? "y" : "ies"}...`}
          status={searchDone ? "done" : "active"}
          dotColor="bg-blue-400"
        />
      )}

      {/* Step 3: Research synthesis */}
      {showSynth && (
        <StepRow
          icon={Lightbulb}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-400"
          label={synthDone ? "Think" : "Thinking"}
          status={synthDone ? "done" : "active"}
          dotColor="bg-amber-400"
          collapsible
          defaultOpen={!synthDone}
        >
          {researchContent ? (
            <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-muted-foreground/85 max-h-[280px] overflow-y-auto">
              {researchContent}
              {!synthDone && (
                <span className="inline-block h-3 w-1.5 animate-pulse bg-amber-400 align-middle ml-0.5" />
              )}
            </pre>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:240ms]" />
              </span>
              Nemotron Ultra analyzing sources...
            </div>
          )}
        </StepRow>
      )}

      {/* Step 4: Generating */}
      {showGenerating && (
        <StepRow
          icon={agentMode === "code" ? Code2 : Bot}
          iconBg="bg-primary/15"
          iconColor="text-primary"
          label={agentMode === "code" ? "Writing code..." : agentMode === "research" ? "Synthesizing answer..." : "Writing response..."}
          status="active"
          dotColor="bg-primary"
        />
      )}

      {/* Collaboration trail + progress */}
      <div className="flex items-start gap-3 px-1 pt-0.5">
        <div className="flex gap-1 mt-0.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${i < stepIdx ? "w-8 bg-primary" : "w-4 bg-muted-foreground/30"}`}
            />
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          {trailItems.map((item, i) => (
            <span key={i} className={`text-[10px] flex items-center gap-1 ${i === trailItems.length - 1 ? `${meta.color} font-medium` : "text-muted-foreground/60"}`}>
              {i > 0 && <span className="text-muted-foreground/40">→</span>}
              {i === 0 && <Zap className="h-2.5 w-2.5" />}
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
