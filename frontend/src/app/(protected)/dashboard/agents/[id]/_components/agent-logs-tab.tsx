/**
 * Logs tab — shows recent session activity as a chronological feed.
 * Displays session updates sorted by time with visual timeline.
 */

"use client"

import { motion } from "framer-motion"
import {
    ScrollText,
    MessageSquare,
    Clock,
    ArrowRight,
    Activity,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { formatRelativeTime, formatEpochMs } from "@/lib/format"
import type { Session } from "@/lib/types/openclaw"

interface AgentLogsTabProps {
    sessions: Session[]
}

const KIND_COLORS: Record<string, string> = {
    main: "bg-emerald-500",
    group: "bg-blue-500",
    cron: "bg-amber-500",
    hook: "bg-purple-500",
    node: "bg-primary",
    other: "bg-muted-foreground",
}

export function AgentLogsTab({ sessions }: AgentLogsTabProps) {
    if (!sessions.length) {
        return (
            <EmptyState
                icon={ScrollText}
                title="No activity logs"
                description="No session activity found for this agent."
            />
        )
    }

    // Build log entries from sessions, sorted by updatedAt descending
    const entries = [...sessions]
        .filter((s) => s.updatedAt)
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .slice(0, 50)

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-border to-transparent" />

            <div className="space-y-1">
                {entries.map((session, index) => {
                    const dotColor = KIND_COLORS[session.kind] ?? KIND_COLORS.other
                    const isActive = session.updatedAt
                        ? Date.now() - session.updatedAt < 30 * 60 * 1000
                        : false

                    return (
                        <motion.div
                            key={session.key}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.04 }}
                            className="group relative flex gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/30"
                        >
                            {/* Timeline dot */}
                            <div className="relative z-10 mt-1 flex shrink-0 flex-col items-center">
                                <div className={`h-3 w-3 rounded-full ${dotColor} ring-4 ring-background`} />
                                {isActive && (
                                    <motion.div
                                        className={`absolute h-3 w-3 rounded-full ${dotColor}`}
                                        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                )}
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <p className="truncate text-sm font-medium">
                                        {session.displayName || session.key}
                                    </p>
                                    {isActive && (
                                        <motion.div
                                            animate={{ opacity: [1, 0.4, 1] }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                            }}
                                        >
                                            <Activity className="h-3 w-3 text-emerald-500" />
                                        </motion.div>
                                    )}
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge className="bg-gradient-to-r from-primary/10 to-secondary/10 text-foreground border-0 text-[10px]">
                                        {session.kind}
                                    </Badge>
                                    {session.channel && session.channel !== "unknown" && (
                                        <>
                                            <ArrowRight className="h-2.5 w-2.5" />
                                            <Badge variant="outline" className="text-[10px] border-primary/20">
                                                {session.channel}
                                            </Badge>
                                        </>
                                    )}
                                    {session.totalTokens != null && (
                                        <span className="ml-auto font-mono text-[10px]">
                                            {session.totalTokens.toLocaleString()} tokens
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Timestamp */}
                            <div className="hidden shrink-0 items-start gap-1 text-[10px] text-muted-foreground sm:flex">
                                <Clock className="mt-0.5 h-3 w-3" />
                                <div className="text-right">
                                    <p>{session.updatedAt ? formatRelativeTime(session.updatedAt) : ""}</p>
                                    <p className="text-muted-foreground/60">
                                        {session.updatedAt ? formatEpochMs(session.updatedAt, "HH:mm:ss") : ""}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
