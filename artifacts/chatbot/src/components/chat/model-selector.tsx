import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useListOpenrouterModels } from "@workspace/api-client-react";

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const { data: models, isLoading } = useListOpenrouterModels();

  if (isLoading) {
    return (
      <div className="h-9 w-[200px] animate-pulse rounded-md bg-muted" />
    );
  }

  if (!models || models.length === 0) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[280px] bg-background">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <div className="flex items-center justify-between w-[240px]">
              <span className="truncate pr-2">{model.name}</span>
              {model.isFree && (
                <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1 py-0 h-4">
                  Free
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
