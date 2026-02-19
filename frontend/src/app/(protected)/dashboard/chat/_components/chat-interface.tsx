/**
 * Chat interface — real-time messaging with agents.
 *
 * Features:
 * - Agent switcher dropdown to chat with any configured agent
 * - Message history loaded via /api/sessions/history
 * - Sends messages via /api/sessions/send
 * - Auto-refresh every 2s when active
 * - Handles content as string OR array of typed parts
 * - Prevents message loops with proper deduplication
 */

"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Send, Bot, User, Loader2, RefreshCw, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { MarkdownViewer } from "@/components/markdown-viewer"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { cn } from "@/lib/utils"
import type { SessionMessage, MessageContentPart } from "@/lib/types/openclaw"

const POLL_INTERVAL_MS = 2000

/* ------------------------------------------------------------------ */
/*  Agent type                                                         */
/* ------------------------------------------------------------------ */

interface AgentEntry {
    id: string
    name?: string
    configured: boolean
    default?: boolean
    emoji?: string
    model?: string
}

/**
 * Resolves the session key for a given agent.
 * The default agent ("main") uses the plain "main" session key.
 * Other agents use the "agent:<id>:main" convention.
 */
function getSessionKeyForAgent(agent: AgentEntry): string {
    if (agent.id === "main" || agent.default) return "main"
    return `agent:${agent.id}:main`
}

/* ------------------------------------------------------------------ */
/*  Message helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Extracts text from message content (handles both string and array formats).
 * Also strips out special tags like <final>, <thinking>, etc.
 */
function getMessageText(content: string | MessageContentPart[]): string {
    let text = ""

    if (typeof content === "string") {
        text = content
    } else if (Array.isArray(content)) {
        text = content
            .filter((part) => part.type === "text" && part.text)
            .map((part) => part.text)
            .join("\n")
    } else {
        text = String(content)
    }

    // Strip out special XML-like tags used by Claude
    text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    text = text.replace(/<final>([\s\S]*?)<\/final>/gi, "$1")
    text = text.replace(/<\/?final>/gi, "")
    text = text.trim()

    return text
}

/**
 * Check if message has tool calls or results
 */
function hasToolContent(content: string | MessageContentPart[]): boolean {
    if (!Array.isArray(content)) return false

    return content.some((part) => {
        const type = part.type?.toLowerCase()
        return type === "tool_use" ||
            type === "tool_call" ||
            type === "tooluse" ||
            type === "toolcall" ||
            type === "tool_result" ||
            type === "toolresult"
    })
}

/**
 * Extract tool cards from message content
 */
function extractToolCards(content: string | MessageContentPart[]): Array<{
    kind: "call" | "result"
    name: string
    args?: unknown
    text?: string
}> {
    if (!Array.isArray(content)) return []

    const cards: Array<{
        kind: "call" | "result"
        name: string
        args?: unknown
        text?: string
    }> = []

    for (const item of content) {
        const type = item.type?.toLowerCase()
        const anyItem = item as any

        if (type === "tool_use" || type === "tool_call" || type === "tooluse" || type === "toolcall") {
            cards.push({
                kind: "call",
                name: anyItem.name || "tool",
                args: anyItem.input || anyItem.arguments || anyItem.args
            })
        }

        if (type === "tool_result" || type === "toolresult") {
            cards.push({
                kind: "result",
                name: anyItem.name || "tool",
                text: anyItem.text || anyItem.content || ""
            })
        }
    }

    return cards
}

/**
 * Render a tool card
 */
function renderToolCard(card: {
    kind: "call" | "result"
    name: string
    args?: unknown
    text?: string
}) {
    const isResult = card.kind === "result"
    const hasOutput = Boolean(card.text?.trim())

    const argsString = card.args
        ? (typeof card.args === 'string' ? card.args : JSON.stringify(card.args, null, 2))
        : null

    return (
        <Card key={`${card.kind}-${card.name}`} className="bg-muted/30 border-muted">
            <CardContent className="p-3">
                <div className="flex items-start gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                        <span className="text-xs">🔧</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{card.name}</span>
                            {isResult && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {hasOutput ? "Completed" : "✓"}
                                </span>
                            )}
                        </div>
                        {argsString && (
                            <div className="mt-1 text-xs text-muted-foreground font-mono break-all">
                                {argsString}
                            </div>
                        )}
                        {hasOutput && (
                            <div className="mt-2 text-xs font-mono bg-background/50 p-2 rounded max-h-20 overflow-y-auto break-words whitespace-pre-wrap">
                                {card.text}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

/**
 * Generate a unique key for a message to prevent duplicates
 */
function getMessageKey(msg: SessionMessage, index: number): string {
    const text = getMessageText(msg.content)
    return `${msg.role}-${msg.timestamp}-${text.slice(0, 50)}-${index}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ChatInterface() {
    /* ---- agents ---- */
    const [agents, setAgents] = useState<AgentEntry[]>([])
    const [selectedAgentId, setSelectedAgentId] = useState<string>("main")
    const [agentsLoading, setAgentsLoading] = useState(true)

    /* ---- chat ---- */
    const [messages, setMessages] = useState<SessionMessage[]>([])
    const [input, setInput] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)
    const [lastMessageCount, setLastMessageCount] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const lastFetchedMessages = useRef<string>("")
    const lastUserMessageCount = useRef(0)

    /* ---- derived ---- */
    const selectedAgent = useMemo(
        () => agents.find((a) => a.id === selectedAgentId) ?? agents[0],
        [agents, selectedAgentId],
    )
    const sessionKey = useMemo(
        () => (selectedAgent ? getSessionKeyForAgent(selectedAgent) : "main"),
        [selectedAgent],
    )
    const agentDisplayName = useMemo(() => {
        if (!selectedAgent) return "Assistant"
        return selectedAgent.name || selectedAgent.id
    }, [selectedAgent])

    /* ------------------------------------------------------------------ */
    /*  Fetch agents on mount                                              */
    /* ------------------------------------------------------------------ */

    useEffect(() => {
        let cancelled = false
        async function loadAgents() {
            try {
                const res = await fetch("/api/agents")
                const data = await res.json()
                if (!cancelled && Array.isArray(data)) {
                    setAgents(data)
                    // Select the default agent initially
                    const defaultAgent = data.find((a: AgentEntry) => a.default) ?? data[0]
                    if (defaultAgent) {
                        setSelectedAgentId(defaultAgent.id)
                    }
                }
            } catch (err) {
                console.error("[Chat] Failed to fetch agents:", err)
                // Fallback: create a default main agent entry so the chat still works
                if (!cancelled) {
                    setAgents([{ id: "main", name: "Main Agent", configured: true, default: true }])
                }
            } finally {
                if (!cancelled) setAgentsLoading(false)
            }
        }
        loadAgents()
        return () => { cancelled = true }
    }, [])

    /* ------------------------------------------------------------------ */
    /*  Scrolling                                                          */
    /* ------------------------------------------------------------------ */

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior,
            })
        }
    }, [])

    /* ------------------------------------------------------------------ */
    /*  Fetch history                                                      */
    /* ------------------------------------------------------------------ */

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/sessions/history?sessionKey=${encodeURIComponent(sessionKey)}&limit=100`,
            )
            const data = await res.json()
            if (Array.isArray(data)) {
                const messagesHash = JSON.stringify(data.map((m: any) => ({
                    role: m.role,
                    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                    timestamp: m.timestamp
                })))

                if (messagesHash !== lastFetchedMessages.current) {
                    console.log("[Chat] Messages updated, count:", data.length)
                    lastFetchedMessages.current = messagesHash
                    setMessages(data)
                    setLastMessageCount(data.length)

                    const lastMessage = data[data.length - 1] as SessionMessage | undefined
                    if (lastMessage && lastMessage.role === "assistant" && isGenerating) {
                        const text = getMessageText(lastMessage.content).trim()
                        if (text.length > 0) {
                            setIsGenerating(false)
                        }
                    }
                }
            }
        } catch (error) {
            console.error("[Chat] Failed to fetch history:", error)
        } finally {
            setIsLoading(false)
        }
    }, [sessionKey, isGenerating])

    /* ------------------------------------------------------------------ */
    /*  Effects                                                            */
    /* ------------------------------------------------------------------ */

    /* Initial load + polling — restarts when sessionKey changes */
    useEffect(() => {
        // Reset state when agent changes
        setMessages([])
        setIsLoading(true)
        setIsGenerating(false)
        lastFetchedMessages.current = ""
        setLastMessageCount(0)

        fetchHistory()
        const id = setInterval(fetchHistory, POLL_INTERVAL_MS)
        return () => clearInterval(id)
    }, [fetchHistory])

    /* Scroll to bottom on initial load */
    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            setTimeout(() => scrollToBottom("auto"), 100)
        }
    }, [isLoading, messages.length, scrollToBottom])

    /* Auto-scroll on new messages */
    useEffect(() => {
        if (messages.length > lastMessageCount) {
            scrollToBottom("smooth")
        }
    }, [messages.length, lastMessageCount, scrollToBottom])

    /* Auto-scroll when generating indicator appears */
    useEffect(() => {
        if (isGenerating) {
            scrollToBottom("smooth")
        }
    }, [isGenerating, scrollToBottom])

    /* Auto-resize textarea */
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [input])

    /* ------------------------------------------------------------------ */
    /*  Handlers                                                           */
    /* ------------------------------------------------------------------ */

    const handleAgentChange = (agentId: string) => {
        if (agentId === selectedAgentId) return
        setSelectedAgentId(agentId)
        setInput("")
    }

    const handleSend = async () => {
        const trimmed = input.trim()
        if (!trimmed || isSending) return

        const messageToSend = trimmed
        setInput("")
        setIsSending(true)
        setIsGenerating(true)

        console.log("[Chat] Sending message to agent:", selectedAgentId, "sessionKey:", sessionKey)

        setTimeout(() => scrollToBottom("smooth"), 100)

        try {
            const res = await fetch("/api/sessions/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: messageToSend,
                    sessionKey,
                }),
            })

            const data = await res.json()
            if (data.ok) {
                console.log("[Chat] Message sent successfully")
                setTimeout(() => {
                    fetchHistory()
                }, 500)
            } else {
                console.error("[Chat] Failed to send message:", data.error)
                setInput(messageToSend)
                setIsGenerating(false)
            }
        } catch (error) {
            console.error("[Chat] Error sending message:", error)
            setInput(messageToSend)
            setIsGenerating(false)
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Render                                                             */
    /* ------------------------------------------------------------------ */

    return (
        <div className="flex h-[calc(100vh-6rem)] flex-col rounded-lg border bg-card">
            {/* ── Agent Selector Header ── */}
            <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-sm">
                        {selectedAgent?.emoji ? (
                            <span className="text-xs leading-none">{selectedAgent.emoji}</span>
                        ) : (
                            <Bot className="h-3.5 w-3.5" />
                        )}
                    </div>

                    {agentsLoading ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading agents…
                        </div>
                    ) : agents.length <= 1 ? (
                        /* Only one agent — no dropdown needed */
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold leading-tight">
                                {agentDisplayName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {selectedAgent?.model ?? "Agent"}
                            </span>
                        </div>
                    ) : (
                        /* Multiple agents — show dropdown */
                        <div className="flex flex-col gap-0.5">
                            <Select
                                value={selectedAgentId}
                                onValueChange={handleAgentChange}
                            >
                                <SelectTrigger
                                    id="agent-selector"
                                    className="h-auto border-none bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 text-xs font-semibold gap-1"
                                >
                                    <SelectValue placeholder="Select agent" />
                                </SelectTrigger>
                                <SelectContent align="start">
                                    {agents.map((agent) => (
                                        <SelectItem
                                            key={agent.id}
                                            value={agent.id}
                                        >
                                            <div className="flex items-center gap-2">
                                                {agent.emoji && (
                                                    <span className="text-base leading-none">{agent.emoji}</span>
                                                )}
                                                <span>{agent.name || agent.id}</span>
                                                {agent.default && (
                                                    <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-[10px] text-muted-foreground pl-0.5">
                                {selectedAgent?.model ?? `ID: ${selectedAgentId}`}
                            </span>
                        </div>
                    )}
                </div>

                {/* Subtle session key indicator */}
                <span className="hidden sm:inline-block rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground select-all">
                    {sessionKey}
                </span>
            </div>

            {/* ── Messages area ── */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            >
                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {!isLoading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                            {selectedAgent?.emoji ? (
                                <span className="text-xl">{selectedAgent.emoji}</span>
                            ) : (
                                <Bot className="h-6 w-6 text-muted-foreground" />
                            )}
                        </div>
                        <h3 className="text-sm font-semibold mb-1">No messages yet</h3>
                        <p className="text-xs text-muted-foreground max-w-xs">
                            Start a conversation with <strong>{agentDisplayName}</strong>. Ask questions, request tasks, or just chat!
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => {
                    const isUser = msg.role === "user"
                    const text = getMessageText(msg.content)
                    const key = getMessageKey(msg, i)
                    const toolCards = hasToolContent(msg.content) ? extractToolCards(msg.content) : []
                    const hasText = text.trim().length > 0

                    if (!hasText && toolCards.length > 0) {
                        return null
                    }

                    if (!hasText && toolCards.length === 0) {
                        return null
                    }

                    return (
                        <div
                            key={key}
                            className={cn(
                                "flex gap-2.5 items-start",
                                isUser && "flex-row-reverse",
                            )}
                        >
                            <div
                                className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                    isUser
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted",
                                )}
                            >
                                {isUser ? (
                                    <User className="h-3.5 w-3.5" />
                                ) : selectedAgent?.emoji ? (
                                    <span className="text-sm leading-none">{selectedAgent.emoji}</span>
                                ) : (
                                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                            </div>
                            <div className={cn("flex-1 space-y-1", isUser && "flex flex-col items-end")}>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold">
                                        {isUser ? "You" : agentDisplayName}
                                    </span>
                                    {msg.timestamp && (
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>

                                {hasText && (
                                    <Card
                                        className={cn(
                                            "max-w-[80%] overflow-hidden",
                                            isUser ? "bg-primary text-primary-foreground" : "bg-muted/50",
                                        )}
                                    >
                                        <CardContent className="px-3 py-2 overflow-hidden">
                                            <div className={cn(
                                                "prose prose-xs max-w-none text-[13px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                                                "break-words overflow-wrap-anywhere",
                                                "[&_pre]:overflow-x-auto [&_pre]:max-w-full [&_pre]:text-xs",
                                                "[&_code]:break-words [&_code]:whitespace-pre-wrap [&_code]:text-xs",
                                                "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5",
                                                isUser ? "prose-invert" : "dark:prose-invert"
                                            )}>
                                                <MarkdownViewer content={text} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )
                })}

                {/* Generating indicator */}
                {isGenerating && (
                    <div className="flex gap-2.5 items-start">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                            {selectedAgent?.emoji ? (
                                <span className="text-sm leading-none">{selectedAgent.emoji}</span>
                            ) : (
                                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold">{agentDisplayName}</span>
                            </div>
                            <Card className="max-w-[80%] bg-muted/50 overflow-hidden">
                                <CardContent className="px-3 py-2">
                                    <TextShimmer className="font-mono text-xs" duration={1.5}>
                                        Generating response...
                                    </TextShimmer>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Input area ── */}
            <div className="border-t bg-muted/30 px-3 py-2.5">
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Message ${agentDisplayName}… (Enter to send, Shift+Enter for new line)`}
                            className="min-h-[44px] max-h-[160px] resize-none text-[13px]"
                            rows={1}
                        />
                    </div>
                    <div className="flex gap-1.5">
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={fetchHistory}
                            className="shrink-0 h-8 w-8"
                            title="Refresh messages"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={!input.trim() || isSending}
                            className="shrink-0 h-8 w-8"
                        >
                            {isSending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Send className="h-3.5 w-3.5" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
