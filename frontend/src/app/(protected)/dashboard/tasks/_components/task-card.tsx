/**
 * Task card for the Kanban board.
 * Adapted from the OpenClaw Mission Control TaskCard.
 *
 * Shows title, priority badge, assignee, due date, and tags.
 * Supports drag-and-drop with visual feedback.
 * Uses shadcn design tokens — no hardcoded colors.
 */

import { CalendarClock, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TaskStatus } from "./types"

interface TaskCardProps {
    title: string
    status?: TaskStatus
    priority?: string
    assignee?: string
    due?: string
    isOverdue?: boolean
    tags?: string[]
    onClick?: () => void
    draggable?: boolean
    isDragging?: boolean
    onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void
    onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void
}

const priorityBadge = (value?: string): string => {
    if (!value) return "bg-muted text-muted-foreground"
    const normalized = value.toLowerCase()
    if (normalized === "critical") return "bg-priority-critical-bg text-priority-critical-fg"
    if (normalized === "high") return "bg-priority-high-bg text-priority-high-fg"
    if (normalized === "medium") return "bg-priority-medium-bg text-priority-medium-fg"
    if (normalized === "low") return "bg-priority-low-bg text-priority-low-fg"
    return "bg-muted text-muted-foreground"
}

const statusBorder = (status?: string): string => {
    if (status === "in_progress") return "border-l-status-in-progress"
    if (status === "review") return "border-l-status-review"
    if (status === "done") return "border-l-status-done"
    return "border-l-status-inbox"
}

/* Use chart colors for tag dots so they blend with the theme */
const TAG_DOT_COLORS: string[] = [
    "bg-chart-1",
    "bg-chart-2",
    "bg-chart-3",
    "bg-chart-4",
    "bg-chart-5",
    "bg-primary",
]

export function TaskCard({
    title,
    status,
    priority,
    assignee,
    due,
    isOverdue = false,
    tags = [],
    onClick,
    draggable = false,
    isDragging = false,
    onDragStart,
    onDragEnd,
}: TaskCardProps) {
    const priorityLabel = priority ? priority.toUpperCase() : "MEDIUM"
    const visibleTags = tags.slice(0, 3)

    return (
        <div
            className={cn(
                "group relative cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:border-ring/40 hover:shadow-lg",
                "border-l-4",
                statusBorder(status),
                isDragging ? "opacity-30 scale-95 grayscale shadow-none ring-2 ring-ring/20" : "shadow-sm",
                "active:scale-[0.98] active:shadow-inner"
            )}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onClick?.()
                }
            }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-3">
                    {/* Title */}
                    <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-3 break-words group-hover:text-primary transition-colors">
                        {title}
                    </p>

                    {/* Tags */}
                    {visibleTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {visibleTags.map((tag, i) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 text-[9px] font-bold text-muted-foreground transition-colors group-hover:bg-card"
                                >
                                    <span
                                        className={cn(
                                            "h-1.5 w-1.5 rounded-full ring-1 ring-background",
                                            TAG_DOT_COLORS[i % TAG_DOT_COLORS.length],
                                        )}
                                    />
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Priority badge */}
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    <span
                        className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.05em]",
                            priorityBadge(priority),
                        )}
                    >
                        {priorityLabel}
                    </span>
                </div>
            </div>

            {/* Footer: assignee + due date */}
            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center ring-1 ring-border/20">
                        <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">{assignee ?? "Unassigned"}</span>
                </div>
                {due ? (
                    <div
                        className={cn(
                            "flex items-center gap-1.5 rounded-md px-1.5 py-0.5",
                            isOverdue && "bg-destructive/10 text-destructive",
                        )}
                    >
                        <CalendarClock className="h-3.5 w-3.5 opacity-70" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">{due}</span>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
