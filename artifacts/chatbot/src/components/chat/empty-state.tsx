import { BarChart3, Code2, Search, ShieldCheck } from "lucide-react";

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

const suggestions = [
  {
    icon: Code2,
    title: "Build an MT5 Expert Advisor",
    prompt: "Help me build an MT5 Expert Advisor. Start by asking for the strategy details you need.",
  },
  {
    icon: BarChart3,
    title: "Backtest a strategy",
    prompt: "Help me design and backtest a trading strategy with realistic assumptions.",
  },
  {
    icon: Search,
    title: "Research a market setup",
    prompt: "Research a robust trading setup and summarize the most actionable findings.",
  },
  {
    icon: ShieldCheck,
    title: "Review risk parameters",
    prompt: "Review my trading risk parameters and help me reduce drawdown.",
  },
];

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-lg font-semibold text-background">
          N
        </div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          How can I help you today?
        </h1>
      </div>

      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map(({ icon: Icon, title, prompt }) => (
          <button
            key={title}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="group flex min-h-14 items-center gap-3 rounded-lg border border-border bg-transparent px-4 py-3 text-left text-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium text-foreground/90">{title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
