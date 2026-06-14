import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Menu, PanelLeftOpen, SquarePen } from "lucide-react";
import { 
  useGetOpenrouterConversation,
  useListOpenrouterMessages,
  useCreateOpenrouterConversation,
  getListOpenrouterConversationsQueryKey,
  getGetOpenrouterConversationQueryKey,
  getListOpenrouterMessagesQueryKey,
} from "@workspace/api-client-react";
import type { OpenrouterMessage } from "@workspace/api-client-react";

import { Sidebar } from "@/components/chat/sidebar";
import { ChatMessage } from "@/components/chat/message";
import type { SearchResult } from "@/components/chat/message";
import { MessageInput } from "@/components/chat/message-input";
import { EmptyState } from "@/components/chat/empty-state";
import { AgentSteps } from "@/components/chat/agent-steps";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const currentId = params.id ? Number(params.id) : null;
  const queryClient = useQueryClient();

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  const [streamingPhase, setStreamingPhase] = useState<"idle" | "thinking" | "searching" | "researching" | "generating">("idle");
  const [streamingAgent, setStreamingAgent] = useState("");
  const [agentMode, setAgentMode] = useState<"general" | "code" | "research">("general");
  const [searchCount, setSearchCount] = useState(0);
  const [researchContent, setResearchContent] = useState("");
  const [thoughtsMap, setThoughtsMap] = useState<Record<number, string>>({});
  const [sourcesMap, setSourcesMap] = useState<Record<number, SearchResult[]>>({});
  const streamingSourcesRef = useRef<SearchResult[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation } = useGetOpenrouterConversation(
    currentId!, 
    { query: { enabled: !!currentId, queryKey: getGetOpenrouterConversationQueryKey(currentId!) } }
  );

  const { data: messages } = useListOpenrouterMessages(
    currentId!,
    { query: { enabled: !!currentId, queryKey: getListOpenrouterMessagesQueryKey(currentId!) } }
  );

  const createConversation = useCreateOpenrouterConversation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, streamingPhase]);

  const handleSend = async (content: string) => {
    if (!content.trim() || isStreaming) return;
    
    let convId = currentId;

    if (!convId) {
      try {
        const newConv = await createConversation.mutateAsync({
          data: { title: content.slice(0, 30) + (content.length > 30 ? "..." : "") }
        });
        convId = newConv.id;
        queryClient.invalidateQueries({ queryKey: getListOpenrouterConversationsQueryKey() });
        window.history.pushState({}, "", `/c/${convId}`);
      } catch (err) {
        console.error("Failed to create conversation:", err);
        return;
      }
    }

    const tempUserMsgId = Date.now();
    const newUserMsg: OpenrouterMessage = {
      id: tempUserMsgId,
      conversationId: convId,
      role: "user",
      content,
      model: null,
      createdAt: new Date().toISOString(),
    };

    queryClient.setQueryData(
      getListOpenrouterMessagesQueryKey(convId),
      (old: OpenrouterMessage[] | undefined) => [...(old || []), newUserMsg]
    );

    setIsStreaming(true);
    setStreamingContent("");
    setStreamingPhase("idle");
    setStreamingAgent("");
    setAgentMode("general");
    setSearchCount(0);
    setStreamingMessageId(Date.now() + 1);
    setResearchContent("");
    streamingSourcesRef.current = [];

    try {
      const response = await fetch(`/api/openrouter/conversations/${convId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let eventBuffer = "";
      let streamError: string | null = null;
      
      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          eventBuffer += decoder.decode(value, { stream: !done });
          const events = eventBuffer.split("\n\n");
          eventBuffer = done ? "" : events.pop() ?? "";
          
          for (const event of events) {
            const lines = event.split("\n").filter(line => line.trim() !== "");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.slice(6);
                if (dataStr === "[DONE]") continue;
                
                try {
                  const data = JSON.parse(dataStr);
                  if (data.error) {
                    streamError = data.error;
                    setStreamingPhase("generating");
                    setStreamingContent(`**AI service error:** ${data.error}`);
                    break;
                  }
                  if (data.done) {
                    break;
                  }
                  if (data.phase === "thinking") {
                    setStreamingPhase("thinking");
                  } else if (data.phase === "agent_mode") {
                    setAgentMode(data.mode || "general");
                  } else if (data.phase === "searching") {
                    setStreamingPhase("searching");
                    setSearchCount(data.count || 3);
                  } else if (data.phase === "search_results") {
                    streamingSourcesRef.current = data.results || [];
                  } else if (data.phase === "searching_done") {
                    // stay in searching phase until researching starts
                  } else if (data.phase === "researching") {
                    setStreamingPhase("researching");
                    setStreamingAgent(data.agent || "Research Agent");
                  } else if (data.phase === "research_chunk") {
                    setResearchContent((prev) => prev + (data.content || ""));
                  } else if (data.phase === "generating") {
                    setStreamingPhase("generating");
                    setStreamingAgent(data.agent || "Nex N2 Pro");
                  } else if (data.content) {
                    setStreamingPhase("generating");
                    setStreamingContent((prev) => prev + data.content);
                  }
                } catch (e) {
                  console.error("Error parsing SSE data", e, dataStr);
                }
              }
            }
          }

          if (streamError || done) break;
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setStreamingContent((prev) => prev + "\n\n*(An error occurred while communicating with the AI)*");
    } finally {
      setIsStreaming(false);
      setStreamingPhase("idle");
      const savedMsgId = streamingMessageId;
      const savedResearch = researchContent;
      const savedSources = streamingSourcesRef.current;
      await queryClient.invalidateQueries({ queryKey: getListOpenrouterMessagesQueryKey(convId) });
      
      const freshMsgs = queryClient.getQueryData<OpenrouterMessage[]>(
        getListOpenrouterMessagesQueryKey(convId)
      );
      const lastAssistant = freshMsgs?.filter(m => m.role === "assistant").at(-1);
      const targetId = lastAssistant?.id ?? savedMsgId;

      if (savedMsgId && savedResearch && targetId) {
        setThoughtsMap((prev) => ({ ...prev, [targetId]: savedResearch }));
      }
      if (savedSources.length > 0 && targetId) {
        setSourcesMap((prev) => ({ ...prev, [targetId]: savedSources }));
      }
      
      if (!currentId && convId) {
        setLocation(`/c/${convId}`);
      }
    }
  };

  const displayMessages = [...(messages || [])];
  
  if (isStreaming && streamingContent && streamingPhase === "generating") {
    displayMessages.push({
      id: streamingMessageId!,
      conversationId: currentId || 0,
      role: "assistant",
      content: streamingContent,
      model: `nex-agi/nex-n2-pro:free|${agentMode}`,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center bg-background px-3 md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[260px]">
              <Sidebar onCollapse={() => setMobileSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="truncate text-base font-semibold text-foreground">
              NexChat
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="max-w-[45%] truncate text-xs text-muted-foreground">
          {conversation?.title || ""}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-w-0">
        <div
          className={`relative hidden shrink-0 overflow-hidden bg-sidebar transition-[width] duration-300 ease-in-out md:block ${
            sidebarOpen ? "w-[260px]" : "w-14"
          }`}
        >
          <div
            aria-hidden={!sidebarOpen}
            className={`absolute inset-y-0 left-0 w-[260px] transition-[transform,opacity] duration-300 ease-in-out ${
              sidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-6 pointer-events-none opacity-0"
            }`}
          >
            <Sidebar onCollapse={() => setSidebarOpen(false)} />
          </div>

          <aside
            aria-hidden={sidebarOpen}
            className={`absolute inset-y-0 left-0 flex w-14 flex-col items-center gap-2 bg-sidebar py-3 transition-opacity duration-200 ${
              sidebarOpen ? "pointer-events-none opacity-0" : "opacity-100 delay-150"
            }`}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-9 w-9 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="Open sidebar"
            >
              <PanelLeftOpen className="h-5 w-5" />
              <span className="sr-only">Open sidebar</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="h-9 w-9 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="New chat"
            >
              <SquarePen className="h-5 w-5" />
              <span className="sr-only">New chat</span>
            </Button>
          </aside>
        </div>

        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex-1 overflow-y-auto min-h-0 relative">
            {!currentId && displayMessages.length === 0 ? (
              <EmptyState onSelectPrompt={handleSend} />
            ) : (
              <div className="pb-28">
                {displayMessages.map((msg) => (
                  <ChatMessage 
                    key={msg.id} 
                    message={msg} 
                    isStreaming={isStreaming && msg.id === streamingMessageId}
                    thoughts={
                      msg.id === streamingMessageId && isStreaming
                        ? researchContent || undefined
                        : thoughtsMap[msg.id]
                    }
                    sources={sourcesMap[msg.id]}
                    onQuickSend={!isStreaming ? handleSend : undefined}
                  />
                ))}
                <div ref={messagesEndRef} className="h-px" />
              </div>
            )}
          </div>

          <div className="w-full shrink-0 bg-background px-3 pb-2 pt-3 md:px-8">
            <div className="mx-auto w-full max-w-3xl">
              {isStreaming && streamingPhase !== "idle" && (
                <AgentSteps
                  phase={streamingPhase}
                  researchContent={researchContent}
                  agentMode={agentMode}
                  searchCount={searchCount}
                />
              )}
              <MessageInput onSend={handleSend} disabled={isStreaming} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
