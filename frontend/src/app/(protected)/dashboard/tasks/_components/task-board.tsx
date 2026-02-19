/**
 * Kanban-style task board with 4 columns: Inbox, In Progress, Review, Done.
 *
 * Adapted from the OpenClaw Mission Control open-source TaskBoard.
 * - Drag-and-drop between columns
 * - FLIP animation for card reordering
 * - Review column sub-filters (All, Approval needed, Blocked)
 * - Respects prefers-reduced-motion
 * - Uses shadcn design tokens — no hardcoded colors
 */

"use client"

import {
    memo,
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { TaskCard } from "./task-card"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "./types"

type ReviewBucket = "all" | "approval_needed" | "blocked"

const columns: Array<{
    title: string
    status: TaskStatus
    dot: string
    badge: string
    bg: string
}> = [
        {
            title: "Inbox",
            status: "inbox",
            dot: "bg-status-inbox",
            badge: "bg-status-inbox-badge-bg text-status-inbox-badge-fg",
            bg: "bg-status-inbox-bg",
        },
        {
            title: "In Progress",
            status: "in_progress",
            dot: "bg-status-in-progress",
            badge: "bg-status-in-progress-badge-bg text-status-in-progress-badge-fg",
            bg: "bg-status-in-progress-bg",
        },
        {
            title: "Review",
            status: "review",
            dot: "bg-status-review",
            badge: "bg-status-review-badge-bg text-status-review-badge-fg",
            bg: "bg-status-review-bg",
        },
        {
            title: "Done",
            status: "done",
            dot: "bg-status-done",
            badge: "bg-status-done-badge-bg text-status-done-badge-fg",
            bg: "bg-status-done-bg",
        },
    ]

type CardPosition = { left: number; top: number }

const KANBAN_MOVE_ANIMATION_MS = 240
const KANBAN_MOVE_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)"

interface TaskBoardProps {
    tasks: Task[]
    onTaskSelect?: (task: Task) => void
    onTaskMove?: (taskId: string, status: TaskStatus) => void | Promise<void>
    readOnly?: boolean
}

/**
 * Compact due-date display.
 * Done tasks are never marked overdue.
 */
function resolveDueState(task: Task): { due: string | undefined; isOverdue: boolean } {
    if (!task.due_at) return { due: undefined, isOverdue: false }
    const date = new Date(task.due_at)
    if (isNaN(date.getTime())) return { due: undefined, isOverdue: false }

    const dueLabel = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    })

    const isOverdue = task.status !== "done" && date.getTime() < Date.now()
    return {
        due: isOverdue ? `Overdue · ${dueLabel}` : dueLabel,
        isOverdue,
    }
}

export const TaskBoard = memo(function TaskBoard({
    tasks,
    onTaskSelect,
    onTaskMove,
    readOnly = false,
}: TaskBoardProps) {
    const boardRef = useRef<HTMLDivElement | null>(null)
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
    const prevPositionsRef = useRef<Map<string, CardPosition>>(new Map())
    const animationRafRef = useRef<number | null>(null)
    const cleanupTimeoutRef = useRef<number | null>(null)
    const animatedTaskIdsRef = useRef<Set<string>>(new Set())

    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [activeColumn, setActiveColumn] = useState<TaskStatus | null>(null)
    const [reviewBucket, setReviewBucket] = useState<ReviewBucket>("all")

    const setCardRef = useCallback(
        (taskId: string) => (node: HTMLDivElement | null) => {
            if (node) {
                cardRefs.current.set(taskId, node)
                return
            }
            cardRefs.current.delete(taskId)
        },
        [],
    )

    const measurePositions = useCallback((): Map<string, CardPosition> => {
        const positions = new Map<string, CardPosition>()
        const container = boardRef.current
        const containerRect = container?.getBoundingClientRect()
        const scrollLeft = container?.scrollLeft ?? 0
        const scrollTop = container?.scrollTop ?? 0

        for (const [taskId, element] of cardRefs.current.entries()) {
            const rect = element.getBoundingClientRect()
            positions.set(taskId, {
                left:
                    containerRect && container
                        ? rect.left - containerRect.left + scrollLeft
                        : rect.left,
                top:
                    containerRect && container
                        ? rect.top - containerRect.top + scrollTop
                        : rect.top,
            })
        }

        return positions
    }, [])

    // FLIP animation for card reordering
    useLayoutEffect(() => {
        const cardRefsSnapshot = cardRefs.current
        if (animationRafRef.current !== null) {
            window.cancelAnimationFrame(animationRafRef.current)
            animationRafRef.current = null
        }
        if (cleanupTimeoutRef.current !== null) {
            window.clearTimeout(cleanupTimeoutRef.current)
            cleanupTimeoutRef.current = null
        }
        for (const taskId of animatedTaskIdsRef.current) {
            const element = cardRefsSnapshot.get(taskId)
            if (!element) continue
            element.style.transform = ""
            element.style.transition = ""
            element.style.willChange = ""
            element.style.position = ""
            element.style.zIndex = ""
        }
        animatedTaskIdsRef.current.clear()

        const prevPositions = prevPositionsRef.current
        const nextPositions = measurePositions()
        prevPositionsRef.current = nextPositions

        if (draggingId) return

        const prefersReducedMotion =
            window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
        if (prefersReducedMotion) return

        const moved: Array<{
            taskId: string
            element: HTMLDivElement
            dx: number
            dy: number
        }> = []
        for (const [taskId, next] of nextPositions.entries()) {
            const prev = prevPositions.get(taskId)
            if (!prev) continue
            const dx = prev.left - next.left
            const dy = prev.top - next.top
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
            const element = cardRefsSnapshot.get(taskId)
            if (!element) continue
            moved.push({ taskId, element, dx, dy })
        }

        if (!moved.length) return
        animatedTaskIdsRef.current = new Set(moved.map(({ taskId }) => taskId))

        for (const { element, dx, dy } of moved) {
            element.style.transform = `translate(${dx}px, ${dy}px)`
            element.style.transition = "transform 0s"
            element.style.willChange = "transform"
            element.style.position = "relative"
            element.style.zIndex = "1"
        }

        animationRafRef.current = window.requestAnimationFrame(() => {
            for (const { element } of moved) {
                element.style.transition = `transform ${KANBAN_MOVE_ANIMATION_MS}ms ${KANBAN_MOVE_EASING}`
                element.style.transform = ""
            }

            cleanupTimeoutRef.current = window.setTimeout(() => {
                for (const { element } of moved) {
                    element.style.transition = ""
                    element.style.willChange = ""
                    element.style.position = ""
                    element.style.zIndex = ""
                }
                animatedTaskIdsRef.current.clear()
                cleanupTimeoutRef.current = null
            }, KANBAN_MOVE_ANIMATION_MS + 60)

            animationRafRef.current = null
        })

        return () => {
            if (animationRafRef.current !== null) {
                window.cancelAnimationFrame(animationRafRef.current)
                animationRafRef.current = null
            }
            if (cleanupTimeoutRef.current !== null) {
                window.clearTimeout(cleanupTimeoutRef.current)
                cleanupTimeoutRef.current = null
            }
            for (const taskId of animatedTaskIdsRef.current) {
                const element = cardRefsSnapshot.get(taskId)
                if (!element) continue
                element.style.transform = ""
                element.style.transition = ""
                element.style.willChange = ""
                element.style.position = ""
                element.style.zIndex = ""
            }
            animatedTaskIdsRef.current.clear()
        }
    }, [draggingId, measurePositions, tasks])

    const grouped = useMemo(() => {
        const buckets: Record<TaskStatus, Task[]> = {
            inbox: [],
            in_progress: [],
            review: [],
            done: [],
        }
        tasks.forEach((task) => {
            const bucket = buckets[task.status] ?? buckets.inbox
            bucket.push(task)
        })
        return buckets
    }, [tasks])

    // Drag handlers
    const handleDragStart =
        (task: Task) => (event: React.DragEvent<HTMLDivElement>) => {
            if (readOnly) {
                event.preventDefault()
                return
            }
            setDraggingId(task.id.toString())
            event.dataTransfer.effectAllowed = "move"
            event.dataTransfer.setData(
                "text/plain",
                JSON.stringify({ taskId: task.id.toString(), status: task.status }),
            )
        }

    const handleDragEnd = () => {
        setDraggingId(null)
        setActiveColumn(null)
    }

    const handleDrop =
        (status: TaskStatus) => (event: React.DragEvent<HTMLDivElement>) => {
            if (readOnly) return
            event.preventDefault()
            setActiveColumn(null)
            setDraggingId(null) // Clear immediately on drop
            const raw = event.dataTransfer.getData("text/plain")
            if (!raw) return
            try {
                const payload = JSON.parse(raw) as { taskId?: string; status?: string }
                if (!payload.taskId || !payload.status) return
                if (payload.status === status) return
                onTaskMove?.(payload.taskId, status)
            } catch {
                // Ignore malformed payloads
            }
        }

    const handleDragOver =
        (status: TaskStatus) => (event: React.DragEvent<HTMLDivElement>) => {
            if (readOnly) return
            event.preventDefault()
            if (activeColumn !== status) {
                setActiveColumn(status)
            }
        }

    const handleDragLeave = (status: TaskStatus) => () => {
        if (readOnly) return
        if (activeColumn === status) {
            setActiveColumn(null)
        }
    }

    return (
        <div
            ref={boardRef}
            data-testid="task-board"
            className={cn(
                "grid w-full grid-cols-1 gap-4 pb-6",
                "sm:grid-cols-2 lg:grid-cols-4",
            )}
        >
            {columns.map((column) => {
                const columnTasks = grouped[column.status] ?? []

                // Review column sub-filters
                const reviewCounts =
                    column.status === "review"
                        ? columnTasks.reduce(
                            (acc, task) => {
                                const hasReview = task.metadata?.review_reason
                                if (hasReview) {
                                    acc.approval_needed += 1
                                } else {
                                    acc.blocked += 1
                                }
                                return acc
                            },
                            {
                                all: columnTasks.length,
                                approval_needed: 0,
                                blocked: 0,
                            },
                        )
                        : null

                const filteredTasks =
                    column.status === "review" && reviewBucket !== "all"
                        ? columnTasks.filter((task) => {
                            if (reviewBucket === "approval_needed")
                                return Boolean(task.metadata?.review_reason)
                            if (reviewBucket === "blocked")
                                return !task.metadata?.review_reason
                            return true
                        })
                        : columnTasks

                return (
                    <div
                        key={column.title}
                        className={cn(
                            "kanban-column min-h-0",
                            "sm:min-h-[calc(100vh-260px)]",
                        )}
                        onDrop={readOnly ? undefined : handleDrop(column.status)}
                        onDragOver={readOnly ? undefined : handleDragOver(column.status)}
                        onDragLeave={
                            readOnly ? undefined : handleDragLeave(column.status)
                        }
                    >
                        {/* Column header */}
                        <div className={cn(
                            "column-header z-10 rounded-t-xl border border-b-0 border-border bg-card px-4 py-3 sm:sticky sm:top-0 sm:backdrop-blur",
                            column.bg
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={cn(
                                            "h-2 w-2 rounded-full",
                                            column.dot,
                                        )}
                                    />
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {column.title}
                                    </h3>
                                </div>
                                <span
                                    className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                                        column.badge,
                                    )}
                                >
                                    {filteredTasks.length}
                                </span>
                            </div>

                            {/* Review sub-filters */}
                            {column.status === "review" && reviewCounts ? (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {(
                                        [
                                            {
                                                key: "all" as const,
                                                label: "All",
                                                count: reviewCounts.all,
                                            },
                                            {
                                                key: "approval_needed" as const,
                                                label: "Approval needed",
                                                count: reviewCounts.approval_needed,
                                            },
                                            {
                                                key: "blocked" as const,
                                                label: "Blocked",
                                                count: reviewCounts.blocked,
                                            },
                                        ] as const
                                    ).map((option) => (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() =>
                                                setReviewBucket(option.key)
                                            }
                                            className={cn(
                                                "rounded-full border px-2.5 py-1 transition",
                                                reviewBucket === option.key
                                                    ? "border-foreground bg-foreground text-background"
                                                    : "border-border bg-card text-muted-foreground hover:border-ring/40 hover:bg-accent",
                                            )}
                                            aria-pressed={
                                                reviewBucket === option.key
                                            }
                                        >
                                            {option.label} · {option.count}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        {/* Column body with cards */}
                        <div className={cn(
                            "rounded-b-xl border border-t-0 border-border p-3 transition-all",
                            column.bg,
                            activeColumn === column.status && !readOnly && "ring-2 ring-ring/40 ring-inset shadow-inner bg-accent/30"
                        )}>
                            <div className="space-y-3 min-h-[100px]">
                                {filteredTasks.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                                        No tasks
                                    </div>
                                )}
                                {filteredTasks.map((task) => {
                                    const dueState = resolveDueState(task)
                                    return (
                                        <div
                                            key={task.id}
                                            ref={setCardRef(task.id.toString())}
                                        >
                                            <TaskCard
                                                title={task.title}
                                                status={task.status}
                                                priority={task.priority}
                                                assignee={task.agent_id ?? undefined}
                                                due={dueState.due}
                                                isOverdue={dueState.isOverdue}
                                                tags={task.tags}
                                                onClick={() => onTaskSelect?.(task)}
                                                draggable={!readOnly}
                                                isDragging={
                                                    draggingId === task.id.toString()
                                                }
                                                onDragStart={
                                                    readOnly
                                                        ? undefined
                                                        : handleDragStart(task)
                                                }
                                                onDragEnd={
                                                    readOnly
                                                        ? undefined
                                                        : handleDragEnd
                                                }
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
})

TaskBoard.displayName = "TaskBoard"
