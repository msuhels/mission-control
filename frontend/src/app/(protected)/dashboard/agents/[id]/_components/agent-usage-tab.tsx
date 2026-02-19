/**
 * Usage tab — shows aggregated usage statistics for the agent.
 * Token counts, active sessions, model distribution, etc.
 */

"use client"

import { motion } from "framer-motion"
import {
    Hash,
    Activity,
    Cpu,
    Radio,
    BarChart3,
    TrendingUp,
    Zap,
    Clock,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { GradientIcon } from "@/components/gradient-icon"
import type { GradientVariant } from "@/components/gradient-icon"
import type { Session } from "@/lib/types/openclaw"
import type { Agent } from "@/lib/types/openclaw"
import type { LucideIcon } from "lucide-react"

interface AgentUsageTabProps {
    sessions: Session[]
    agent: Agent
}

interface StatCardProps {
    icon: LucideIcon
    variant: GradientVariant
    label: string
    value: string | number
    sub?: string
    index: number
}

function StatCard({ icon, variant, label, value, sub, index }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-shadow hover:shadow-lg hover:shadow-primary/5"
        >
            <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20" />
                <div className="absolute inset-[1px] rounded-xl bg-card" />
            </div>
            <div className="relative z-10 flex items-start gap-4">
                <GradientIcon icon={icon} variant={variant} size="lg" />
                <div>
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight">
                        {typeof value === "number" ? value.toLocaleString() : value}
                    </p>
                    {sub && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

export function AgentUsageTab({ sessions, agent }: AgentUsageTabProps) {
    if (!sessions.length) {
        return (
            <EmptyState
                icon={BarChart3}
                title="No usage data"
                description="No sessions to compute usage from. Start using this agent to see stats."
            />
        )
    }

    const totalSessions = sessions.length
    const now = Date.now()
    const activeSessions = sessions.filter(
        (s) => s.updatedAt && now - s.updatedAt < 30 * 60 * 1000
    ).length
    const totalTokens = sessions.reduce(
        (sum, s) => sum + (s.totalTokens ?? 0),
        0
    )
    const contextTokens = sessions.reduce(
        (sum, s) => sum + (s.contextTokens ?? 0),
        0
    )

    // Model distribution
    const modelCounts = new Map<string, number>()
    for (const s of sessions) {
        const model = s.model ?? agent.model ?? "unknown"
        modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1)
    }
    const models = Array.from(modelCounts.entries()).sort(
        (a, b) => b[1] - a[1]
    )

    // Kind distribution
    const kindCounts = new Map<string, number>()
    for (const s of sessions) {
        kindCounts.set(s.kind, (kindCounts.get(s.kind) ?? 0) + 1)
    }
    const kinds = Array.from(kindCounts.entries()).sort(
        (a, b) => b[1] - a[1]
    )

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={Radio}
                    variant="info"
                    label="Total Sessions"
                    value={totalSessions}
                    index={0}
                />
                <StatCard
                    icon={Activity}
                    variant="success"
                    label="Active Sessions"
                    value={activeSessions}
                    sub="Updated within 30 min"
                    index={1}
                />
                <StatCard
                    icon={Hash}
                    variant="primary"
                    label="Total Tokens"
                    value={totalTokens}
                    sub={`${contextTokens.toLocaleString()} context`}
                    index={2}
                />
                <StatCard
                    icon={Zap}
                    variant="warning"
                    label="Avg Tokens / Session"
                    value={
                        totalSessions > 0
                            ? Math.round(totalTokens / totalSessions).toLocaleString()
                            : "—"
                    }
                    index={3}
                />
            </div>

            {/* Model & Kind Distribution */}
            <div className="grid gap-4 sm:grid-cols-2">
                {/* Model Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35 }}
                    className="rounded-xl border border-border/50 bg-card p-5 shadow-sm"
                >
                    <div className="mb-4 flex items-center gap-2">
                        <GradientIcon icon={Cpu} variant="secondary" size="sm" />
                        <h3 className="text-sm font-semibold">Model Distribution</h3>
                    </div>
                    <div className="space-y-3">
                        {models.map(([model, count]) => {
                            const pct = Math.round((count / totalSessions) * 100)
                            return (
                                <div key={model}>
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="truncate font-mono text-muted-foreground">
                                            {model}
                                        </span>
                                        <span className="ml-2 shrink-0 font-semibold">
                                            {count} ({pct}%)
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, delay: 0.5 }}
                                            className="h-full rounded-full bg-gradient-to-r from-secondary/80 to-secondary/40"
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>

                {/* Session Kind Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="rounded-xl border border-border/50 bg-card p-5 shadow-sm"
                >
                    <div className="mb-4 flex items-center gap-2">
                        <GradientIcon icon={TrendingUp} variant="info" size="sm" />
                        <h3 className="text-sm font-semibold">Session Types</h3>
                    </div>
                    <div className="space-y-3">
                        {kinds.map(([kind, count]) => {
                            const pct = Math.round((count / totalSessions) * 100)
                            return (
                                <div key={kind}>
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="capitalize font-medium text-muted-foreground">
                                            {kind}
                                        </span>
                                        <span className="ml-2 shrink-0 font-semibold">
                                            {count} ({pct}%)
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, delay: 0.6 }}
                                            className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary/40"
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
