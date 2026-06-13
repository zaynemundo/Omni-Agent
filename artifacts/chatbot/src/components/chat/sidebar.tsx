import { Plus, MessageSquare, Trash2, Edit2, Check, X, MoreHorizontal, Activity, Brain, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
  useListOpenrouterConversations,
  useDeleteOpenrouterConversation,
  useRenameOpenrouterConversation,
  getListOpenrouterConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BacktestPanel } from "./backtest-panel";

interface Memory {
  id: number;
  key: string;
  value: string;
  updatedAt: string;
}

function MemoryPanel() {
  const [open, setOpen] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/memory");
      const data = await res.json() as Memory[];
      setMemories(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchMemories();
  }, [open]);

  const handleDelete = async (key: string) => {
    await fetch(`/api/memory/${encodeURIComponent(key)}`, { method: "DELETE" });
    setMemories((prev) => prev.filter((m) => m.key !== key));
  };

  const handleSaveEdit = async (key: string) => {
    if (!editVal.trim()) return;
    await fetch(`/api/memory/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: editVal.trim() }),
    });
    setMemories((prev) => prev.map((m) => m.key === key ? { ...m, value: editVal.trim() } : m));
    setEditingKey(null);
  };

  return (
    <div className="border-t border-sidebar-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
      >
        <Brain className="h-4 w-4 text-violet-400" />
        <span className="flex-1 text-left font-medium">Memory</span>
        {memories.length > 0 && !open && (
          <span className="text-xs bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full">
            {memories.length}
          </span>
        )}
        {open
          ? <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="px-3 pb-3">
          {loading ? (
            <div className="text-xs text-sidebar-foreground/40 px-2 py-2">Loading...</div>
          ) : memories.length === 0 ? (
            <div className="text-xs text-sidebar-foreground/40 px-2 py-3 text-center">
              <Brain className="h-5 w-5 mx-auto mb-1 opacity-30" />
              No memories yet.<br />
              <span className="text-sidebar-foreground/30">Facts are learned automatically.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {memories.map((m) => (
                <div
                  key={m.key}
                  className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors"
                >
                  {editingKey === m.key ? (
                    <div className="flex flex-1 items-center gap-1">
                      <input
                        autoFocus
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(m.key);
                          if (e.key === "Escape") setEditingKey(null);
                        }}
                        className="flex-1 text-xs bg-background border border-border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button onClick={() => handleSaveEdit(m.key)} className="text-green-400 hover:text-green-300">
                        <Check className="h-3 w-3" />
                      </button>
                      <button onClick={() => setEditingKey(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono text-muted-foreground/60 block truncate">{m.key}</span>
                        <span className="text-xs text-sidebar-foreground/85 truncate block">{m.value}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => { setEditingKey(m.key); setEditVal(m.value); }}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.key)}
                          className="text-muted-foreground hover:text-red-400 p-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: conversations, isLoading } = useListOpenrouterConversations();
  const deleteConversation = useDeleteOpenrouterConversation();
  const renameConversation = useRenameOpenrouterConversation();

  const currentId = location.startsWith("/c/") ? Number(location.split("/c/")[1]) : null;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [backtestOpen, setBacktestOpen] = useState(false);

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    deleteConversation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
        if (currentId === id) setLocation("/");
      }
    });
  };

  const startEdit = (e: React.MouseEvent, id: number, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const saveEdit = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (editingId && editTitle.trim()) {
      renameConversation.mutate({ id: editingId, data: { title: editTitle.trim() } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
          setEditingId(null);
        }
      });
    } else {
      setEditingId(null);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="flex h-full w-full flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-4 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight px-2 text-sidebar-primary">NexChat</span>
      </div>
      
      <div className="px-4 pb-4 space-y-2">
        <Button 
          className="w-full justify-start gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 shadow-sm"
          onClick={() => setLocation("/")}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <Button 
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => setBacktestOpen(true)}
        >
          <Activity className="h-4 w-4" />
          Backtest
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-2 flex flex-col gap-1">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-sidebar-foreground/50">Loading...</div>
          ) : conversations?.length === 0 ? (
            <div className="px-4 py-2 text-sm text-sidebar-foreground/50">No conversations</div>
          ) : (
            conversations?.map((conv) => (
              editingId === conv.id ? (
                <div key={conv.id} className="flex items-center gap-1 rounded-md px-2 py-1.5 bg-sidebar-accent">
                  <Input 
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit(e as any);
                    }}
                    className="h-7 text-sm px-2 bg-background border-none focus-visible:ring-1"
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={saveEdit}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={cancelEdit}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Link key={conv.id} href={`/c/${conv.id}`}>
                  <div
                    className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer ${
                      currentId === conv.id ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                      <div className="truncate text-left flex-1">{conv.title}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1 data-[state=open]:opacity-100"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                          <span className="sr-only">More</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => startEdit(e, conv.id, conv.title)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDelete(e, conv.id)} className="text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
              )
            ))
          )}
        </div>
      </ScrollArea>

      {/* Memory Panel */}
      <MemoryPanel />
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold">
            U
          </div>
          <div className="text-sm font-medium">User</div>
        </div>
      </div>

      <BacktestPanel open={backtestOpen} onOpenChange={setBacktestOpen} />
    </div>
  );
}
