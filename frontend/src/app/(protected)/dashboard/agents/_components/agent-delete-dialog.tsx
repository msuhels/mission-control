/**
 * Agent delete confirmation dialog.
 * Shows a warning and requires user confirmation before deleting an agent.
 */

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
    AlertTriangle,
    Trash2,
    Loader2,
    RefreshCw,
    ShieldAlert,
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { GradientIcon } from "@/components/gradient-icon"
import { toast } from "sonner"
import type { Agent } from "@/lib/types/openclaw"

interface AgentDeleteDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    agent: Agent | null
    onSuccess?: (agents: Agent[]) => void
}

export function AgentDeleteDialog({
    open,
    onOpenChange,
    agent,
    onSuccess,
}: AgentDeleteDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleDelete = async () => {
        if (!agent) return
        setError(null)
        setIsDeleting(true)

        try {
            const res = await fetch(`/api/agents?id=${encodeURIComponent(agent.id)}`, {
                method: "DELETE",
            })
            const data = await res.json()

            if (!res.ok || data.error) {
                setError(data.error || "Failed to delete agent")
                return
            }

            toast.success(`Agent "${agent.id}" deleted`, {
                description: data.gatewayRestarted
                    ? "Gateway restarted to apply changes."
                    : "Note: Gateway may need a manual restart.",
            })

            onSuccess?.(data.agents ?? [])
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete agent")
        } finally {
            setIsDeleting(false)
        }
    }

    if (!agent) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <GradientIcon icon={ShieldAlert} variant="danger" size="lg" />
                        <div>
                            <DialogTitle>Delete Agent</DialogTitle>
                            <DialogDescription>
                                This action is <strong>irreversible</strong>.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="my-2 space-y-3">
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
                    >
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <div className="text-sm">
                            <p className="font-medium text-foreground">
                                Deleting &quot;{agent.id}&quot; will:
                            </p>
                            <ul className="mt-2 space-y-1 text-muted-foreground">
                                <li className="flex items-center gap-1.5">
                                    <span className="h-1 w-1 rounded-full bg-amber-500" />
                                    Remove the agent from configuration
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <span className="h-1 w-1 rounded-full bg-amber-500" />
                                    Prune workspace and state directories
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <span className="h-1 w-1 rounded-full bg-amber-500" />
                                    Remove all routing bindings
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <span className="h-1 w-1 rounded-full bg-amber-500" />
                                    Restart the gateway
                                </li>
                            </ul>
                        </div>
                    </motion.div>

                    {agent.workspace && (
                        <div className="rounded-lg bg-muted/50 p-3 text-xs">
                            <span className="text-muted-foreground">Workspace: </span>
                            <code className="font-mono text-foreground">{agent.workspace}</code>
                        </div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                        >
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>{error}</p>
                        </motion.div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-gradient-to-r from-destructive to-destructive/80"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting…
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Agent
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
