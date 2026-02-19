/**
 * Task Detail Side Panel.
 * Uses Vaul for a premium-feeling drawer.
 * Shows task metadata, steps (agent action tracking), and reviews.
 */

"use client"

import { useEffect, useState } from "react"
import { Drawer } from "vaul"
import {
    X,
    CheckCircle2,
    Circle,
    AlertCircle,
    Clock,
    User,
    Tag,
    MessageSquare,
    Activity,
    ShieldAlert
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task, TaskStep, TaskReview } from "./types"

interface TaskDetailProps {
    task: Task | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onTaskUpdate: () => void
}

export function TaskDetail({ task, open, onOpenChange, onTaskUpdate }: TaskDetailProps) {
    const [steps, setSteps] = useState<TaskStep[]>([])
    const [reviews, setReviews] = useState<TaskReview[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open && task) {
            fetchTaskDetails(task.id)
        } else if (!open) {
            // Optional: clear on close
            setSteps([])
            setReviews([])
        }
    }, [open, task?.id])

    const fetchTaskDetails = async (taskId: number) => {
        setIsLoading(true)
        try {
            const [stepsRes, reviewsRes] = await Promise.all([
                fetch(`/api/tasks/${taskId}/steps`),
                fetch(`/api/tasks/${taskId}/reviews`)
            ])
            if (stepsRes.ok) {
                const data = await stepsRes.json()
                setSteps(data)
            }
            if (reviewsRes.ok) {
                const data = await reviewsRes.json()
                setReviews(data)
            }
        } catch (err) {
            console.error("Failed to fetch task details:", err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleUpdateStatus = async (newStatus: string) => {
        if (!task) return
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) onTaskUpdate()
        } catch (err) {
            console.error("Failed to update status:", err)
        }
    }

    if (!task) return null

    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                <Drawer.Content className="bg-card flex flex-col rounded-l-2xl h-full w-full max-w-xl fixed bottom-0 right-0 z-50 overflow-hidden border-l border-border outline-none shadow-2xl">
                    {/* Header */}
                    <div className="p-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur sticky top-0 z-10">
                        <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    task.status === "done" ? "bg-status-done-badge-bg text-status-done-badge-fg" :
                                        task.status === "in_progress" ? "bg-status-in-progress-badge-bg text-status-in-progress-badge-fg" :
                                            task.status === "review" ? "bg-status-review-badge-bg text-status-review-badge-fg" :
                                                "bg-status-inbox-badge-bg text-status-inbox-badge-fg"
                                )}>
                                    {task.status.replace("_", " ")}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">TASK-{task.id}</span>
                            </div>
                            <Drawer.Title className="text-xl font-bold text-foreground leading-tight">
                                {task.title}
                            </Drawer.Title>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
                        {/* Description */}
                        <section>
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                <MessageSquare size={14} /> Description
                            </h4>
                            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                {task.description || "No description provided."}
                            </p>
                        </section>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-4 border border-border/50 bg-muted/30 p-4 rounded-xl">
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Priority</span>
                                <div className="flex items-center gap-2">
                                    <ShieldAlert size={14} className="text-primary" />
                                    <span className="text-sm font-medium capitalize">{task.priority}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Assignee</span>
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-secondary" />
                                    <span className="text-sm font-medium">{task.agent_id || "Unassigned"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Tracking (Steps) */}
                        <section>
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Activity size={14} /> Agent Action Log
                            </h4>
                            <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                                {isLoading ? (
                                    <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">Loading execution log...</div>
                                ) : steps.length > 0 ? (
                                    steps.map((step) => (
                                        <div key={step.id} className="relative pl-8 group">
                                            <div className={cn(
                                                "absolute left-0 top-1 p-1 rounded-full bg-card border-2 z-10 transition-colors duration-300",
                                                step.status === "completed" ? "border-status-done text-status-done" :
                                                    step.status === "failed" ? "border-destructive text-destructive" :
                                                        step.status === "in_progress" ? "border-status-in-progress text-status-in-progress animate-pulse" :
                                                            "border-muted text-muted-foreground"
                                            )}>
                                                {step.status === "completed" ? <CheckCircle2 size={14} /> :
                                                    step.status === "failed" ? <AlertCircle size={14} /> :
                                                        <Circle size={14} />}
                                            </div>
                                            <div className="p-3 bg-muted/40 rounded-lg group-hover:bg-muted/60 transition-colors border border-transparent group-hover:border-border/50">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h5 className="text-sm font-bold">{step.title}</h5>
                                                    <span className="text-[10px] font-mono text-muted-foreground/60">{step.duration_ms ? `${step.duration_ms}ms` : ""}</span>
                                                </div>
                                                {step.description && <p className="text-xs text-muted-foreground mb-2">{step.description}</p>}
                                                {step.agent_note && (
                                                    <div className="mt-2 text-[11px] bg-card p-2 rounded-md border border-border italic text-foreground opacity-80">
                                                        "{step.agent_note}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="pl-8 py-4 italic text-sm text-muted-foreground border-l-2 border-border ml-[11px]">
                                        Agent hasn't started execution yet.
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Review System */}
                        <section>
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <ShieldAlert size={14} /> Human Review
                            </h4>
                            {reviews.length > 0 ? (
                                <div className="space-y-4">
                                    {reviews.map((review) => (
                                        <div key={review.id} className={cn(
                                            "p-4 rounded-xl border",
                                            review.status === "approved" ? "bg-status-done/5 border-status-done/20" :
                                                review.status === "pending" ? "bg-status-review/5 border-status-review/20" :
                                                    "bg-destructive/5 border-destructive/20"
                                        )}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        review.status === "approved" ? "bg-status-done" : "bg-status-review"
                                                    )} />
                                                    <span className="text-xs font-bold uppercase tracking-wide">{review.status}</span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm font-medium mb-1">{review.reason}</p>
                                            {review.reviewer_comment && (
                                                <p className="text-xs text-muted-foreground border-t border-border/10 pt-2 mt-2 italic">
                                                    "{review.reviewer_comment}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center border-2 border-dashed border-border rounded-xl">
                                    <ShieldAlert size={24} className="mx-auto text-muted-foreground/30 mb-3" />
                                    <p className="text-sm text-muted-foreground">No review requested yet.</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Quick Actions Footer */}
                    <div className="p-6 border-t border-border bg-card/80 backdrop-blur sticky bottom-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleUpdateStatus("in_progress")}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                            >
                                <Play size={16} fill="currentColor" /> Start Execution
                            </button>
                            <button
                                onClick={() => handleUpdateStatus("done")}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} /> Mark as Done
                            </button>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}

function Play({ size, fill, className }: { size: number, fill?: string, className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fill || "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
    )
}
