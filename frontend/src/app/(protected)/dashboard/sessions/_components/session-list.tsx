/**
 * Session list with rich animated cards and visual indicators.
 * Features gradient kind badges, animated metadata, and hover effects.
 *
 * @param sessions - Array of Session objects
 */

"use client"

import { motion } from "framer-motion"
import { Radio, Hash, Clock, Cpu, MessageSquare, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { AnimatedCard, AnimatedContainer } from "@/components/animated-card"
import { GradientIcon } from "@/components/gradient-icon"
import { formatRelativeTime } from "@/lib/format"
import type { Session } from "@/lib/types/openclaw"
import type { GradientVariant } from "@/components/gradient-icon"

interface SessionListProps {
    sessions: Session[]
}

const KIND_CONFIG: Record<string, { variant: GradientVariant; label: string; gradient: string }> = {
    main: {
        variant: "success",
        label: "Main",
        gradient: "from-emerald-500/10 to-emerald-500/5",
    },
    group: {
        variant: "info",
        label: "Group",
        gradient: "from-blue-500/10 to-blue-500/5",
    },
    cron: {
        variant: "warning",
        label: "Cron",
        gradient: "from-amber-500/10 to-amber-500/5",
    },
    hook: {
        variant: "purple",
        label: "Hook",
        gradient: "from-purple-500/10 to-purple-500/5",
    },
    node: {
        variant: "primary",
        label: "Node",
        gradient: "from-primary/10 to-primary/5",
    },
    other: {
        variant: "secondary",
        label: "Other",
        gradient: "from-muted to-muted/50",
    },
}

export function SessionList({ sessions }: SessionListProps) {
    if (!sessions.length) {
        return (
            <EmptyState
                icon={Radio}
                title="No sessions"
                description="No active sessions found. Start a conversation to create a session."
            />
        )
    }

    /* Sort by most recently updated */
    const sorted = [...sessions].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

    return (
        <AnimatedContainer className="space-y-3">
            {sorted.map((session, index) => {
                const config = KIND_CONFIG[session.kind] ?? KIND_CONFIG.other
                const isActive = session.updatedAt
                    ? Date.now() - session.updatedAt < 30 * 60 * 1000
                    : false

                return (
                    <AnimatedCard key={session.key} index={index}>
                        {/* Left accent stripe */}
                        <div className="flex">
                            <div className={`w-1 shrink-0 rounded-l-xl bg-gradient-to-b ${config.gradient}`} />

                            <div className="flex flex-1 items-center gap-4 p-4">
                                {/* Kind icon */}
                                <GradientIcon
                                    icon={MessageSquare}
                                    variant={config.variant}
                                    size="md"
                                    pulse={isActive}
                                />

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-semibold">
                                            {session.displayName || session.key}
                                        </p>
                                        {isActive && (
                                            <motion.div
                                                animate={{ opacity: [1, 0.5, 1] }}
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
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        <Badge className="bg-gradient-to-r from-primary/10 to-secondary/10 text-foreground border-0 text-[10px]">
                                            {config.label}
                                        </Badge>
                                        {session.channel && session.channel !== "unknown" && (
                                            <Badge variant="outline" className="text-[10px] border-primary/20">
                                                {session.channel}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="hidden shrink-0 items-center gap-4 text-xs text-muted-foreground sm:flex">
                                    {session.model && (
                                        <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
                                            <Cpu className="h-3 w-3 text-secondary/70" />
                                            <span className="max-w-[120px] truncate font-mono text-[10px]">
                                                {session.model}
                                            </span>
                                        </div>
                                    )}
                                    {session.totalTokens != null && (
                                        <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
                                            <Hash className="h-3 w-3 text-primary/70" />
                                            <span className="font-mono text-[10px]">
                                                {session.totalTokens.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {session.updatedAt && (
                                        <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
                                            <Clock className="h-3 w-3 text-amber-500/70" />
                                            <span className="text-[10px]">
                                                {formatRelativeTime(session.updatedAt)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </AnimatedCard>
                )
            })}
        </AnimatedContainer>
    )
}
