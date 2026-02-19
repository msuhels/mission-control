/**
 * Dialog for creating a new task.
 * Posts to the /api/tasks proxy which writes to PostgREST.
 * Uses shadcn design tokens — no hardcoded colors.
 */

"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TaskStatus, TaskPriority } from "./types"

interface CreateTaskDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated: () => void
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
    { value: "inbox", label: "Inbox" },
    { value: "in_progress", label: "In Progress" },
    { value: "review", label: "Review" },
    { value: "done", label: "Done" },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
]

export function CreateTaskDialog({
    open,
    onOpenChange,
    onCreated,
}: CreateTaskDialogProps) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [status, setStatus] = useState<TaskStatus>("inbox")
    const [priority, setPriority] = useState<TaskPriority>("medium")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!open) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setIsSubmitting(true)
        setError(null)

        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || null,
                    status,
                    priority,
                }),
            })

            if (!res.ok) throw new Error("Failed to create task")

            // Reset form
            setTitle("")
            setDescription("")
            setStatus("inbox")
            setPriority("medium")
            onCreated()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />

            {/* Dialog */}
            <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-foreground">
                        Create Task
                    </h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label
                            htmlFor="task-title"
                            className="block text-sm font-medium text-foreground mb-1"
                        >
                            Title <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                            placeholder="What needs to be done?"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label
                            htmlFor="task-description"
                            className="block text-sm font-medium text-foreground mb-1"
                        >
                            Description
                        </label>
                        <textarea
                            id="task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                            placeholder="Add details..."
                        />
                    </div>

                    {/* Status & Priority row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="task-status"
                                className="block text-sm font-medium text-foreground mb-1"
                            >
                                Status
                            </label>
                            <select
                                id="task-status"
                                value={status}
                                onChange={(e) =>
                                    setStatus(e.target.value as TaskStatus)
                                }
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label
                                htmlFor="task-priority"
                                className="block text-sm font-medium text-foreground mb-1"
                            >
                                Priority
                            </label>
                            <select
                                id="task-priority"
                                value={priority}
                                onChange={(e) =>
                                    setPriority(e.target.value as TaskPriority)
                                }
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                            >
                                {PRIORITY_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || isSubmitting}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
