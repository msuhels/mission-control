/**
 * Tasks page — Kanban board backed by PostgREST.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, CalendarClock } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { TaskBoard } from "./_components/task-board"
import { CreateTaskDialog } from "./_components/create-task-dialog"
import { TaskDetail } from "./_components/task-detail"
import type { Task, TaskStatus } from "./_components/types"

const POSTGREST_URL = process.env.NEXT_PUBLIC_POSTGREST_URL || "/api/tasks"

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showCreate, setShowCreate] = useState(false)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [showDetail, setShowDetail] = useState(false)
    const selectedTaskId = selectedTask?.id
    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch("/api/tasks")
            if (!res.ok) throw new Error("Failed to fetch tasks")
            const data = await res.json()
            setTasks(data)

            // Update selected task if it's currently being viewed
            if (selectedTaskId) {
                const updated = data.find((t: Task) => t.id === selectedTaskId)
                if (updated) setSelectedTask(updated)
            }

            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error")
        } finally {
            setIsLoading(false)
        }
    }, [selectedTaskId])

    useEffect(() => {
        fetchTasks()
        // Poll every 10 seconds for updates
        const interval = setInterval(fetchTasks, 10_000)
        return () => clearInterval(interval)
    }, [fetchTasks])

    const handleTaskMove = useCallback(
        async (taskId: string, newStatus: TaskStatus) => {
            // Optimistic update
            setTasks((prev) =>
                prev.map((t) =>
                    t.id.toString() === taskId
                        ? {
                            ...t,
                            status: newStatus,
                            ...(newStatus === "in_progress" && !t.started_at
                                ? { started_at: new Date().toISOString() }
                                : {}),
                            ...(newStatus === "done"
                                ? { completed_at: new Date().toISOString() }
                                : {}),
                        }
                        : t,
                ),
            )

            try {
                const body: Record<string, string> = { status: newStatus }
                if (newStatus === "in_progress") body.started_at = new Date().toISOString()
                if (newStatus === "done") body.completed_at = new Date().toISOString()

                await fetch(`/api/tasks/${taskId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                })
            } catch {
                // Revert on failure
                fetchTasks()
            }
        },
        [fetchTasks],
    )

    const handleTaskCreated = useCallback(() => {
        setShowCreate(false)
        fetchTasks()
    }, [fetchTasks])

    const handleTaskSelect = useCallback((task: Task) => {
        setSelectedTask(task)
        setShowDetail(true)
    }, [])

    return (
        <>
            <PageHeader
                title="Tasks"
                description={`Manage and track task workflows. ${tasks.length} task${tasks.length === 1 ? "" : "s"} total.`}
            >
                <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" />
                    New Task
                </button>
            </PageHeader>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                </div>
            ) : tasks.length === 0 ? (
                <EmptyState
                    icon={CalendarClock}
                    title="No tasks yet"
                    description="Create your first task or let an agent generate tasks automatically."
                >
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        Create your first task
                    </button>
                </EmptyState>
            ) : (
                <TaskBoard
                    tasks={tasks}
                    onTaskMove={handleTaskMove}
                    onTaskSelect={handleTaskSelect}
                />
            )}

            <CreateTaskDialog
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={handleTaskCreated}
            />

            <TaskDetail
                task={selectedTask}
                open={showDetail}
                onOpenChange={setShowDetail}
                onTaskUpdate={fetchTasks}
            />
        </>
    )
}
