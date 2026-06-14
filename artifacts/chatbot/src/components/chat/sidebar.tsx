import { Plus, MessageSquare, Trash2, Edit2, Check, X, MoreHorizontal, Activity, Brain, ChevronDown, ChevronRight, Pencil, PanelLeft, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
  useListOpenrouterConversations,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface SidebarProps {
  onCollapse?: () => void;
}

export function Sidebar({ onCollapse }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: conversations, isLoading } = useListOpenrouterConversations();
  const renameConversation = useRenameOpenrouterConversation();
  const conversationList = Array.isArray(conversations) ? conversations : [];

  const currentId = location.startsWith("/c/") ? Number(location.split("/c/")[1]) : null;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [backtestOpen, setBacktestOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<{ id: number; title: string } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const requestDelete = (id: number, title: string) => {
    setDeleteError("");
    setChatToDelete({ id, title });
  };

  const confirmDelete = async () => {
    if (!chatToDelete || isDeleting) return;

    const deletedId = chatToDelete.id;
    setDeleteError("");
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/openrouter/conversations/${deletedId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const responseBody = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(responseBody?.error || `Delete failed with status ${response.status}`);
      }

      queryClient.setQueryData(
        getListOpenrouterConversationsQueryKey(),
        (old: unknown) => Array.isArray(old) ? old.filter((conv) => conv.id !== deletedId) : old,
      );
      await queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
      if (currentId === deletedId) setLocation("/");
      setChatToDelete(null);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      setDeleteError(error instanceof Error ? error.message : "Could not delete this chat.");
    } finally {
      setIsDeleting(false);
    }
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
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between px-3">
        <div className="flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground text-sm font-semibold text-sidebar">
            N
          </span>
          <div className="text-base font-semibold text-sidebar-foreground">NexChat</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          className="h-8 w-8 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          title="Close sidebar"
        >
          <PanelLeft className="h-4 w-4" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>
      
      <div className="space-y-1 px-3 pb-4">
        <Button 
          variant="outline"
          className="h-11 w-full justify-start gap-3 border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setLocation("/")}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <Button 
          variant="outline"
          className="h-10 w-full justify-start gap-3 border-0 bg-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setBacktestOpen(true)}
        >
          <Activity className="h-4 w-4" />
          Backtest
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 px-2 py-2">
          <div className="mb-1 px-3 pt-2 text-xs font-medium text-sidebar-foreground/45">
            Chat history
          </div>
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-sidebar-foreground/50">Loading...</div>
          ) : conversationList.length === 0 ? (
            <div className="px-3 py-2 text-xs text-sidebar-foreground/40">No conversations yet</div>
          ) : (
            conversationList.map((conv) => (
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
                <div
                  key={conv.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => setLocation(`/c/${conv.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setLocation(`/c/${conv.id}`);
                    }
                  }}
                  className={`group relative flex min-h-10 items-center rounded-md px-3 py-2 pr-12 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer ${
                      currentId === conv.id ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                      <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
                      <div className="min-w-0 flex-1 truncate text-left">{conv.title}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Open options for ${conv.title}`}
                          className="absolute right-2 top-1/2 z-10 h-7 w-7 -translate-y-1/2 bg-sidebar text-sidebar-foreground/70 opacity-100 shadow-sm transition-[opacity,background-color,color] hover:bg-sidebar-accent hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:data-[state=open]:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => startEdit(e, conv.id, conv.title)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => requestDelete(conv.id, conv.title)}
                          className="text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
              )
            ))
          )}
        </div>
      </ScrollArea>

      <MemoryPanel />
      
      <div className="p-2">
        <div className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-sidebar-accent">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground/70">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">User</div>
            <div className="truncate text-[10px] text-sidebar-foreground/40">OpenRouter workspace</div>
          </div>
        </div>
      </div>

      <BacktestPanel open={backtestOpen} onOpenChange={setBacktestOpen} />

      <AlertDialog open={chatToDelete !== null} onOpenChange={(open) => {
        if (!open && !isDeleting) setChatToDelete(null);
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{chatToDelete?.title}" and its messages. This action cannot be undone.
            </AlertDialogDescription>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
