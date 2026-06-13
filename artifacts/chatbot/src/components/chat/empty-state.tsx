import { Bot } from "lucide-react";
import type { AiModel } from "@workspace/api-client-react/src/generated/api.schemas";

interface EmptyStateProps {
  model?: AiModel;
}

export function EmptyState({ model }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Bot className="h-8 w-8" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        How can I help you today?
      </h2>
      {model && (
        <p className="mb-8 max-w-md text-sm text-muted-foreground">
          You are currently chatting with {model.name}. {model.description}
        </p>
      )}
      
      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer">
          <div className="text-sm font-medium text-foreground">Analyze data</div>
          <div className="text-xs text-muted-foreground">Upload your files and ask for insights or visualizations</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer">
          <div className="text-sm font-medium text-foreground">Write code</div>
          <div className="text-xs text-muted-foreground">Help with debugging, refactoring, or writing new scripts</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer">
          <div className="text-sm font-medium text-foreground">Draft content</div>
          <div className="text-xs text-muted-foreground">Write emails, blog posts, or creative stories</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer">
          <div className="text-sm font-medium text-foreground">Search the web</div>
          <div className="text-xs text-muted-foreground">Enable agent mode to find up-to-date information</div>
        </div>
      </div>
    </div>
  );
}
