import { ArrowUpRight, BarChart3, Bot, Code2, Search, ShieldCheck, Sparkles } from "lucide-react";

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

const suggestions = [
  {
    icon: Code2,
    title: "Build an MT5 Expert Advisor",
    description: "Turn a trading idea into production-ready MQL5.",
    prompt: "Help me build an MT5 Expert Advisor. Start by asking for the strategy details you need.",
    color: "text-cyan-300 bg-cyan-400/10",
  },
  {
    icon: BarChart3,
    title: "Backtest a strategy",
    description: "Test entries, exits, spread, and risk assumptions.",
    prompt: "Help me design and backtest a trading strategy with realistic assumptions.",
    color: "text-emerald-300 bg-emerald-400/10",
  },
  {
    icon: Search,
    title: "Research a market setup",
    description: "Gather current sources and actionable findings.",
    prompt: "Research a robust trading setup and summarize the most actionable findings.",
    color: "text-amber-300 bg-amber-400/10",
  },
  {
    icon: ShieldCheck,
    title: "Review risk parameters",
    description: "Stress-test lot size, drawdown, and risk-reward.",
    prompt: "Review my trading risk parameters and help me reduce drawdown.",
    color: "text-rose-300 bg-rose-400/10",
  },
];

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center px-5 py-10 sm:px-8 lg:py-16">
      <div className="mb-8 max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Groq-powered trading workspace
          </div>
        </div>
        <h1 className="max-w-xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          What are we building today?
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Research market ideas, design strategies, generate MQL5, and validate risk in one focused workspace.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
        {suggestions.map(({ icon: Icon, title, description, prompt, color }) => (
          <button
            key={title}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="group flex min-h-28 items-start gap-4 rounded-lg border border-border bg-card/70 p-4 text-left transition-colors hover:border-primary/35 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${color}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3 text-sm font-medium text-foreground">
                {title}
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </span>
              <span className="mt-2 block text-xs leading-5 text-muted-foreground">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
