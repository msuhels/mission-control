/**
 * Cron job card grid with rich animations and visual effects.
 * Features gradient headers, animated status indicators,
 * and animated action buttons with Framer Motion.
 *
 * @param jobs - Array of CronJob objects from the gateway
 */

"use client"

import { useState, useEffect } from "react"
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
    Edit,
    Power,
    Plus,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/empty-state"
import { AnimatedCard, AnimatedContainer } from "@/components/animated-card"
import { GradientIcon } from "@/components/gradient-icon"
import { parseCronSchedule, formatEpochMs } from "@/lib/format"
import type { CronJob, Agent } from "@/lib/types/openclaw"
import { toast } from "sonner"

interface CronGridProps {
    jobs: CronJob[]
    onJobCreated?: () => void
}

interface EditDialogState {
    open: boolean
    job: CronJob | null
}

interface CreateDialogState {
    open: boolean
}

async function cronAction(action: string, jobId: string, data?: any) {
    const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, jobId, ...data }),
    })
    return res.json()
}

export function CronGrid({ jobs: initialJobs, onJobCreated }: CronGridProps) {
    const [jobs, setJobs] = useState<CronJob[]>(initialJobs)
    const [agents, setAgents] = useState<Agent[]>([])
    const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, job: null })
    const [createDialog, setCreateDialog] = useState<CreateDialogState>({ open: false })
    const [editForm, setEditForm] = useState({
        name: "",
        schedule: "",
        description: "",
        message: "",
    })
    const [createForm, setCreateForm] = useState({
        name: "",
        scheduleType: "cron" as "cron" | "every",
        cronExpression: "",
        everyMinutes: "60",
        message: "",
        description: "",
        sessionTarget: "main" as "main" | "isolated",
        agentId: "",
    })

    // Fetch agents on mount
    useEffect(() => {
        fetch("/api/agents")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setAgents(data)
                    // Set default agent if available
                    const defaultAgent = data.find((a) => a.default)
                    if (defaultAgent && !createForm.agentId) {
                        setCreateForm((prev) => ({ ...prev, agentId: defaultAgent.id }))
                    }
                }
            })
            .catch((err) => console.error("Failed to fetch agents:", err))
    }, [])

    if (!jobs.length) {
        return (
            <>
                <EmptyState
                    icon={CalendarClock}
                    title="No cron jobs"
                    description="No scheduled jobs are configured. Create your first cron job to get started."
                />
                <div className="mt-4 flex justify-center">
                    <Button onClick={() => setCreateDialog({ open: true })}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Cron Job
                    </Button>
                </div>
            </>
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

    const handleToggle = async (jobId: string, currentEnabled: boolean) => {
        const newEnabled = !currentEnabled
        toast.loading(`${currentEnabled ? "Disabling" : "Enabling"} job…`)
        
        try {
            const res = await fetch("/api/cron", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update",
                    jobId,
                    patch: { enabled: newEnabled }
                }),
            })
            const result = await res.json()
            
            if (result.ok) {
                setJobs((prev) =>
                    prev.map((j) =>
                        (j.jobId ?? j.id) === jobId ? { ...j, enabled: newEnabled } : j
                    )
                )
                toast.success(`Job ${newEnabled ? "enabled" : "disabled"}`)
            } else {
                toast.error(result.error ?? `Failed to ${newEnabled ? "enable" : "disable"} job`)
            }
        } catch (error) {
            toast.error("Failed to update job")
        }
    }

    const handleEdit = async (jobId: string) => {
        const job = jobs.find((j) => (j.jobId ?? j.id) === jobId)
        if (!job) return
        
        // Handle schedule - extract string representation
        let scheduleStr = ""
        if (job.schedule) {
            if (job.schedule.kind === "every" && job.schedule.everyMs) {
                // Convert milliseconds to cron-like format
                const minutes = Math.floor(job.schedule.everyMs / 60000)
                scheduleStr = `*/${minutes} * * * *` // Every X minutes
            } else if (job.schedule.kind === "cron" && job.schedule.expr) {
                scheduleStr = job.schedule.expr
            } else if (job.schedule.kind === "at" && job.schedule.at) {
                scheduleStr = job.schedule.at
            }
        }
        
        // Extract message from payload
        const messageStr = job.payload?.message || job.payload?.text || ""
        
        setEditForm({
            name: job.name || "",
            schedule: scheduleStr,
            description: job.description || "",
            message: messageStr,
        })
        setEditDialog({ open: true, job })
    }

    const handleSaveEdit = async () => {
        if (!editDialog.job) return
        
        const jobId = editDialog.job.jobId ?? editDialog.job.id
        toast.loading("Updating job…")
        
        try {
            // Build the patch object based on what changed
            const patch: any = {
                name: editForm.name,
                description: editForm.description,
            }
            
            // Handle schedule update
            if (editForm.schedule) {
                patch.schedule = editForm.schedule
            }
            
            // Handle message update - need to update payload.message
            if (editForm.message) {
                patch.payload = {
                    ...(editDialog.job.payload || {}),
                    message: editForm.message
                }
            }
            
            const res = await fetch("/api/cron", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update",
                    jobId,
                    patch
                }),
            })
            const result = await res.json()
            
            if (result.ok) {
                // Update local state - only update the fields that changed
                setJobs((prev) =>
                    prev.map((j) => {
                        if ((j.jobId ?? j.id) === jobId) {
                            const updated = { ...j }
                            updated.name = editForm.name
                            updated.description = editForm.description
                            // Don't override schedule object with string - let the backend handle it
                            // Update payload.message if it exists
                            if (updated.payload) {
                                updated.payload = {
                                    ...updated.payload,
                                    message: editForm.message
                                }
                            }
                            return updated
                        }
                        return j
                    })
                )
                setEditDialog({ open: false, job: null })
                toast.success("Job updated successfully")
            } else {
                toast.error(result.error ?? "Failed to update job")
            }
        } catch (error) {
            toast.error("Failed to update job")
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

    const handleCreate = async () => {
        if (!createForm.name.trim()) {
            toast.error("Job name is required")
            return
        }
        if (!createForm.message.trim()) {
            toast.error("Message is required")
            return
        }
        if (!createForm.agentId) {
            toast.error("Please select an agent")
            return
        }

        toast.loading("Creating job…")

        try {
            // Build schedule based on type
            let schedule: any
            if (createForm.scheduleType === "cron") {
                const expr = createForm.cronExpression.trim()
                if (!expr) {
                    toast.error("Cron expression is required")
                    return
                }
                
                // Validate cron expression has 5, 6, or 7 parts
                const parts = expr.split(/\s+/)
                if (parts.length < 5 || parts.length > 7) {
                    toast.error("Cron expression must have 5, 6, or 7 space-separated parts (e.g., '0 9 * * *')")
                    return
                }
                
                schedule = {
                    kind: "cron",
                    expr: expr,
                }
            } else {
                const minutes = parseInt(createForm.everyMinutes, 10)
                if (isNaN(minutes) || minutes <= 0) {
                    toast.error("Invalid interval minutes")
                    return
                }
                schedule = {
                    kind: "every",
                    everyMs: minutes * 60 * 1000,
                }
            }

            // Build job object
            const job: any = {
                name: createForm.name.trim(),
                description: createForm.description.trim() || undefined,
                schedule,
                sessionTarget: createForm.sessionTarget,
                enabled: true,
                agentId: createForm.agentId,
                payload: {
                    kind: createForm.sessionTarget === "main" ? "systemEvent" : "agentTurn",
                    [createForm.sessionTarget === "main" ? "text" : "message"]: createForm.message.trim(),
                },
            }

            const res = await fetch("/api/cron", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "add",
                    job,
                }),
            })
            const result = await res.json()

            if (result.ok) {
                toast.success("Job created successfully")
                setCreateDialog({ open: false })
                setCreateForm({
                    name: "",
                    scheduleType: "cron",
                    cronExpression: "",
                    everyMinutes: "60",
                    message: "",
                    description: "",
                    sessionTarget: "main",
                    agentId: agents.find((a) => a.default)?.id || "",
                })
                // Refresh the job list
                if (onJobCreated) {
                    onJobCreated()
                }
            } else {
                toast.error(result.error ?? "Failed to create job")
            }
        } catch (error) {
            toast.error("Failed to create job")
        }
    }

    return (
        <>
            {/* Header with Create Button */}
            <div className="mb-4 flex justify-end">
                <Button onClick={() => setCreateDialog({ open: true })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Job
                </Button>
            </div>

            <AnimatedContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job, index) => {
                const id = job.jobId ?? job.id
                const schedule = parseCronSchedule(job.schedule)

                return (
                    <AnimatedCard key={id} index={index}>
                        {/* Top gradient stripe (green for active, muted for disabled) */}
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

                            {/* Divider */}
                            <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                            {/* Details */}
                            <div className="space-y-2.5">
                                {/* Schedule */}
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.08 + 0.2 }}
                                    className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2 text-xs"
                                >
                                    <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                                    <span className="font-mono text-muted-foreground">{schedule}</span>
                                </motion.div>

                                {/* Delivery */}
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

                                {/* Wake mode */}
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

                            {/* Description */}
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
                                        Run
                                    </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className={`h-8 text-xs ${
                                            job.enabled
                                                ? "border-amber-500/20 hover:border-amber-500/40 text-amber-600 dark:text-amber-400"
                                                : "border-emerald-500/20 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                        }`}
                                        onClick={() => handleToggle(id, job.enabled)}
                                    >
                                        <Power className="mr-1.5 h-3 w-3" />
                                        {job.enabled ? "Disable" : "Enable"}
                                    </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-xs hover:bg-muted"
                                        onClick={() => handleEdit(id)}
                                    >
                                        <Edit className="mr-1.5 h-3 w-3" />
                                        Edit
                                    </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemove(id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </motion.div>
                            </div>
                        </div>
                    </AnimatedCard>
                )
            })}
        </AnimatedContainer>

        {/* Edit Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, job: null })}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Cron Job</DialogTitle>
                    <DialogDescription>
                        Update the cron job configuration. Changes will take effect immediately.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Job name"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="schedule">Schedule (Cron Expression)</Label>
                        <Input
                            id="schedule"
                            value={editForm.schedule}
                            onChange={(e) => setEditForm({ ...editForm, schedule: e.target.value })}
                            placeholder="0 9 * * *"
                            className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                            {editForm.schedule || "Enter a cron expression"}
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                            id="message"
                            value={editForm.message}
                            onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                            placeholder="Message to send"
                            rows={3}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                            id="description"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Job description"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setEditDialog({ open: false, job: null })}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSaveEdit}>
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={createDialog.open} onOpenChange={(open) => setCreateDialog({ open })}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Cron Job</DialogTitle>
                    <DialogDescription>
                        Schedule a new automated task. The job will run according to the schedule you define.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="create-name">Name</Label>
                        <Input
                            id="create-name"
                            value={createForm.name}
                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                            placeholder="Daily reminder"
                        />
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="create-agent">Agent</Label>
                        <Select
                            value={createForm.agentId}
                            onValueChange={(value) =>
                                setCreateForm({ ...createForm, agentId: value })
                            }
                        >
                            <SelectTrigger id="create-agent">
                                <SelectValue placeholder="Select an agent" />
                            </SelectTrigger>
                            <SelectContent>
                                {agents.map((agent) => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                        {agent.emoji && `${agent.emoji} `}
                                        {agent.name || agent.id}
                                        {agent.default && " (default)"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Which agent should execute this job
                        </p>
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="create-session-target">Session Target</Label>
                        <Select
                            value={createForm.sessionTarget}
                            onValueChange={(value: "main" | "isolated") =>
                                setCreateForm({ ...createForm, sessionTarget: value })
                            }
                        >
                            <SelectTrigger id="create-session-target">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="main">Main Session</SelectItem>
                                <SelectItem value="isolated">Isolated Session</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Main: system event in main session. Isolated: separate agent turn.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="create-schedule-type">Schedule Type</Label>
                        <Select
                            value={createForm.scheduleType}
                            onValueChange={(value: "cron" | "every") =>
                                setCreateForm({ ...createForm, scheduleType: value })
                            }
                        >
                            <SelectTrigger id="create-schedule-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cron">Cron Expression</SelectItem>
                                <SelectItem value="every">Interval (Every X minutes)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {createForm.scheduleType === "cron" ? (
                        <div className="grid gap-2">
                            <Label htmlFor="create-cron">Cron Expression</Label>
                            <Input
                                id="create-cron"
                                value={createForm.cronExpression}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, cronExpression: e.target.value })
                                }
                                placeholder="0 9 * * *"
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                5 parts: minute hour day month weekday (e.g., "0 9 * * *" = daily at 9:00 AM)
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            <Label htmlFor="create-every">Interval (Minutes)</Label>
                            <Input
                                id="create-every"
                                type="number"
                                min="1"
                                value={createForm.everyMinutes}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, everyMinutes: e.target.value })
                                }
                                placeholder="60"
                            />
                            <p className="text-xs text-muted-foreground">
                                Run every {createForm.everyMinutes || "X"} minutes
                            </p>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="create-message">Message</Label>
                        <Textarea
                            id="create-message"
                            value={createForm.message}
                            onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                            placeholder="What should the job do?"
                            rows={3}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="create-description">Description (Optional)</Label>
                        <Input
                            id="create-description"
                            value={createForm.description}
                            onChange={(e) =>
                                setCreateForm({ ...createForm, description: e.target.value })
                            }
                            placeholder="Brief description of this job"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialog({ open: false })}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate}>Create Job</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}
