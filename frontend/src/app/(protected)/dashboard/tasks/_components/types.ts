/**
 * Shared types for task management.
 */

export type TaskStatus = "inbox" | "in_progress" | "review" | "done"
export type TaskPriority = "low" | "medium" | "high" | "critical"
export type StepStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped"
export type ReviewStatus = "pending" | "approved" | "rejected"

export interface Task {
    id: number
    requirement_id: number | null
    title: string
    description: string | null
    status: TaskStatus
    priority: TaskPriority
    agent_id: string | null
    session_key: string | null
    due_at: string | null
    started_at: string | null
    completed_at: string | null
    tags: string[]
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface TaskStep {
    id: number
    task_id: number
    title: string
    description: string | null
    status: StepStatus
    agent_note: string | null
    duration_ms: number | null
    sort_order: number
    created_at: string
}

export interface TaskReview {
    id: number
    task_id: number
    reason: string
    confidence: number | null
    status: ReviewStatus
    reviewer_comment: string | null
    created_at: string
    resolved_at: string | null
}

export interface Requirement {
    id: number
    title: string
    description: string | null
    cron_job_id: string | null
    cron_expr: string | null
    agent_id: string | null
    is_active: boolean
    tags: string[]
    created_at: string
    updated_at: string
}
