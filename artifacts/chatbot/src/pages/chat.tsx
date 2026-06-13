import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Circle, Menu } from "lucide-react";
import { 
  useGetOpenrouterConversation,
  useListOpenrouterMessages,
  useCreateOpenrouterConversation,
  getListOpenrouterConversationsQueryKey,
  getGetOpenrouterConversationQueryKey,
  getListOpenrouterMessagesQueryKey,
  useSearchWeb,
  useFetchPage
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
      
      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(line => line.trim() !== "");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") continue;
              
              try {
                const data = JSON.parse(dataStr);
                if (data.error) {
                  setStreamingContent((prev) => prev + `\n\n**Error**: ${data.error}`);
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
                  setStreamingAgent(data.agent || "Llama 3.3 70B");
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
      model: `llama-3.3-70b-versatile|${agentMode}`,
      createdAt: new Date().toISOString(),
    });
  }

  const [searchQuery, setSearchQuery] = useState("");
  const searchWeb = useSearchWeb();
  const fetchPage = useFetchPage();

  const handleTestSearch = () => {
    if (searchQuery) {
      searchWeb.mutate({ data: { query: searchQuery } });
    }
  };

  const handleTestFetch = () => {
    if (searchQuery.startsWith("http")) {
      fetchPage.mutate({ data: { url: searchQuery } });
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center border-b border-border bg-background/95 px-4 backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Sidebar</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[260px]">
              <Sidebar />
            </SheetContent>
          </Sheet>
          
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {conversation?.title || "New workspace"}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
              Groq connected
            </div>
          </div>
        </div>
        
        <div className="flex items-center text-xs text-muted-foreground hidden">
           <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
           <button onClick={handleTestSearch}>Search</button>
           <button onClick={handleTestFetch}>Fetch</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-w-0">
        <div className="hidden w-[280px] shrink-0 border-r border-border md:block">
          <Sidebar />
        </div>

        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex-1 overflow-y-auto min-h-0 relative">
            {!currentId && displayMessages.length === 0 ? (
              <EmptyState onSelectPrompt={handleSend} />
            ) : (
              <div>
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

          <div className="w-full shrink-0 border-t border-border/60 bg-background/95 px-4 pb-3 pt-3 backdrop-blur md:px-8">
            <div className="mx-auto w-full max-w-4xl">
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
