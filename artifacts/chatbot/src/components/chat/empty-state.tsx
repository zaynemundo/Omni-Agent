import { Bot } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Bot className="h-8 w-8" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        How can I help you today?
      </h2>
      <p className="mb-8 max-w-md text-sm text-muted-foreground">
        Nemotron Ultra researches. Nex N2 Pro codes. Two AIs working together on every message.
      </p>
      
      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer">
          <div className="text-sm font-medium text-foreground">Create an MT5 Expert Advisor</div>
          <div className="text-xs text-muted-foreground">Describe your trading strategy, Nex N2 Pro writes the MQL5 code</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer">
          <div className="text-sm font-medium text-foreground">Backtest a strategy</div>
          <div className="text-xs text-muted-foreground">Run simulated trades on XAUUSD, EURUSD, and more with real statistics</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer">
          <div className="text-sm font-medium text-foreground">Research trading strategies</div>
          <div className="text-xs text-muted-foreground">Nemotron Ultra searches for the latest techniques and hands findings to Nex N2 Pro</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer">
          <div className="text-sm font-medium text-foreground">Analyze risk & parameters</div>
          <div className="text-xs text-muted-foreground">Optimize lot size, drawdown, and risk-reward ratio for your EA</div>
        </div>
      </div>
    </div>
  );
}