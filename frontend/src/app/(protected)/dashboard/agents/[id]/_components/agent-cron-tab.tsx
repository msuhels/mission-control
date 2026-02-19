/**
 * Scheduling/Cron tab — displays cron jobs for this agent.
 * Reuses existing cron grid card patterns.
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
    CalendarClock,
    Play,
    Trash2,
    Clock,
    Zap,
    Radio,
    CheckCircle2,
    XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import { AnimatedCard, AnimatedContainer } from "@/components/animated-card"
import { GradientIcon } from "@/components/gradient-icon"
import { parseCronSchedule, formatEpochMs } from "@/lib/format"
import type { CronJob } from "@/lib/types/openclaw"
import { toast } from "sonner"

interface AgentCronTabProps {
    jobs: CronJob[]
}

async function cronAction(action: string, jobId: string) {
    const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, jobId }),
    })
    return res.json()
}

export function AgentCronTab({ jobs: initialJobs }: AgentCronTabProps) {
    const [jobs, setJobs] = useState<CronJob[]>(initialJobs)

    if (!jobs.length) {
        return (
            <EmptyState
                icon={CalendarClock}
                title="No scheduled jobs"
                description="No cron jobs are configured for this agent."
            />
        )
    }

    const handleRun = async (jobId: string) => {
        toast.loading("Running job…")
        const result = await cronAction("run", jobId)
        if (result.ok) {
            toast.success("Job triggered successfully")
        } else {
            toast.error(result.error ?? "Failed to run job")
        }
    }

    const handleRemove = async (jobId: string) => {
        toast.loading("Removing job…")
        const result = await cronAction("remove", jobId)
        if (result.ok) {
            setJobs((prev) => prev.filter((j) => (j.jobId ?? j.id) !== jobId))
            toast.success("Job removed")
        } else {
            toast.error(result.error ?? "Failed to remove job")
        }
    }

    return (
        <AnimatedContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job, index) => {
                const id = job.jobId ?? job.id
                const schedule = parseCronSchedule(job.schedule)

                return (
                    <AnimatedCard key={id} index={index}>
                        <div
                            className={`h-1 w-full bg-gradient-to-r ${job.enabled
                                    ? "from-emerald-500/60 via-secondary/40 to-emerald-500/60"
                                    : "from-muted-foreground/20 via-muted-foreground/10 to-muted-foreground/20"
                                }`}
                        />

                        <div className="p-5">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <GradientIcon
                                        icon={CalendarClock}
                                        variant={job.enabled ? "warning" : "secondary"}
                                        size="lg"
                                        pulse={job.enabled}
                                    />
                                    <div>
                                        <h3 className="text-base font-semibold tracking-tight">
                                            {job.name}
                                        </h3>
                                        <div className="mt-1.5 flex items-center gap-1.5">
                                            <Badge
                                                className={`text-[10px] border-0 ${job.enabled
                                                        ? "bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                        : "bg-muted text-muted-foreground"
                                                    }`}
                                            >
                                                {job.enabled ? (
                                                    <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                                                ) : (
                                                    <XCircle className="mr-1 h-2.5 w-2.5" />
                                                )}
                                                {job.enabled ? "Active" : "Disabled"}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] border-primary/20">
                                                {job.sessionTarget}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                            {/* Details */}
                            <div className="space-y-2.5">
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.08 + 0.2 }}
                                    className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2 text-xs"
                                >
                                    <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                                    <span className="font-mono text-muted-foreground">{schedule}</span>
                                </motion.div>

                                {job.delivery && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.08 + 0.3 }}
                                        className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2 text-xs"
                                    >
                                        <Radio className="h-3.5 w-3.5 shrink-0 text-secondary/70" />
                                        <span className="text-muted-foreground">{job.delivery.mode}</span>
                                        {job.delivery.channel && (
                                            <Badge variant="outline" className="text-[10px] ml-auto">
                                                {job.delivery.channel}
                                            </Badge>
                                        )}
                                    </motion.div>
                                )}

                                {job.wakeMode && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.08 + 0.4 }}
                                        className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2 text-xs"
                                    >
                                        <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
                                        <span className="text-muted-foreground">{job.wakeMode}</span>
                                    </motion.div>
                                )}
                            </div>

                            {/* Timestamps */}
                            {(job.lastRun || job.nextRun) && (
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                                    {job.lastRun && (
                                        <span className="flex items-center gap-1">
                                            <span className="text-foreground/70">Last:</span>
                                            {formatEpochMs(job.lastRun)}
                                        </span>
                                    )}
                                    {job.nextRun && (
                                        <span className="flex items-center gap-1">
                                            <span className="text-foreground/70">Next:</span>
                                            {formatEpochMs(job.nextRun)}
                                        </span>
                                    )}
                                </div>
                            )}

                            {job.description && (
                                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                                    {job.description}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="mt-4 flex items-center gap-2">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40"
                                        onClick={() => handleRun(id)}
                                    >
                                        <Play className="mr-1.5 h-3 w-3 text-primary" />
                                        Run Now
                                    </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemove(id)}
                                    >
                                        <Trash2 className="mr-1.5 h-3 w-3" />
                                        Remove
                                    </Button>
                                </motion.div>
                            </div>
                        </div>
                    </AnimatedCard>
                )
            })}
        </AnimatedContainer>
    )
}
