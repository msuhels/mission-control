/**
 * Reusable agent Create/Edit dialog.
 *
 * Create mode: uses `openclaw agents add` with name, workspace, and model.
 * Edit mode:   uses `openclaw agents set-identity` for name/emoji changes.
 *              Model/workspace edits are NOT supported via CLI in non-interactive
 *              mode — the dialog shows these as read-only with guidance.
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    Bot,
    Folder,
    Cpu,
    Loader2,
    Sparkles,
    AlertTriangle,
    RefreshCw,
    Info,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GradientIcon } from "@/components/gradient-icon"
import { toast } from "sonner"
import type { Agent } from "@/lib/types/openclaw"

interface AgentFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    agent?: Agent | null
    onSuccess?: (agents: Agent[]) => void
}

export function AgentFormDialog({
    open,
    onOpenChange,
    agent,
    onSuccess,
}: AgentFormDialogProps) {
    const isEditing = Boolean(agent)

    // Create mode fields
    const [name, setName] = useState("")
    const [workspace, setWorkspace] = useState("")
    const [workspaceManuallyEdited, setWorkspaceManuallyEdited] = useState(false)
    const [model, setModel] = useState("")

    // Edit mode additional fields (identity)
    const [emoji, setEmoji] = useState("")

    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [gatewayWarning, setGatewayWarning] = useState<string | null>(null)

    /**
     * Normalize agent name → id (lowercase, hyphens for spaces/underscores)
     * to match the openclaw CLI convention.
     */
    function normalizeAgentId(raw: string): string {
        return raw.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "")
    }

    /**
     * When the user types an agent name in create mode, auto-fill the
     * workspace with `~/.openclaw/workspaces/<normalizedName>`.
     * Stops auto-filling once the user manually edits the workspace.
     */
    function handleNameChange(value: string) {
        setName(value)
        if (!isEditing && !workspaceManuallyEdited) {
            const id = normalizeAgentId(value)
            setWorkspace(id ? `~/.openclaw/workspaces/${id}` : "")
        }
    }

    function handleWorkspaceChange(value: string) {
        setWorkspace(value)
        setWorkspaceManuallyEdited(true)
    }

    // Pre-fill form
    useEffect(() => {
        if (agent) {
            setName(agent.name || agent.id || "")
            setWorkspace(agent.workspace || "")
            setModel(agent.model || "")
            setEmoji(agent.emoji || "")
        } else {
            setName("")
            setWorkspace("")
            setWorkspaceManuallyEdited(false)
            setModel("")
            setEmoji("")
        }
        setError(null)
        setGatewayWarning(null)
    }, [agent, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setGatewayWarning(null)
        setIsSaving(true)

        try {
            let res: Response

            if (isEditing) {
                // Edit mode: use set-identity CLI (name, emoji, theme, avatar)
                res = await fetch("/api/agents", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: agent!.id,
                        name: name.trim() || undefined,
                        emoji: emoji.trim() || undefined,
                    }),
                })
            } else {
                // Create mode: use agents add CLI
                res = await fetch("/api/agents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, workspace, model }),
                })
            }

            const data = await res.json()

            if (!res.ok || data.error) {
                setError(data.error || "Something went wrong")
                return
            }

            if (data.gatewayError) {
                setGatewayWarning(
                    `Agent saved but gateway restart failed: ${data.gatewayError}. You may need to restart it manually.`
                )
            }

            toast.success(
                isEditing
                    ? `Agent "${agent!.id}" identity updated`
                    : `Agent "${name}" created`,
                {
                    description: data.gatewayRestarted
                        ? "Gateway restarted to apply changes."
                        : "Note: Gateway may need a manual restart.",
                }
            )

            onSuccess?.(data.agents ?? [])
            if (!data.gatewayError) {
                onOpenChange(false)
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to save agent"
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <GradientIcon
                            icon={isEditing ? Bot : Sparkles}
                            variant={isEditing ? "secondary" : "primary"}
                            size="lg"
                        />
                        <div>
                            <DialogTitle>
                                {isEditing ? "Edit Agent Identity" : "Create Agent"}
                            </DialogTitle>
                            <DialogDescription>
                                {isEditing
                                    ? `Update identity for "${agent?.id}". Uses \`openclaw agents set-identity\`.`
                                    : "Add a new isolated agent. Uses `openclaw agents add` with workspace setup."}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    {/* Agent Name */}
                    <div className="space-y-2">
                        <Label htmlFor="agent-name" className="flex items-center gap-1.5 text-sm">
                            <Bot className="h-3.5 w-3.5 text-primary/70" />
                            {isEditing ? "Display Name" : "Agent Name"}
                        </Label>
                        <Input
                            id="agent-name"
                            placeholder={isEditing ? "Update display name" : "e.g. research, ops, writer"}
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="bg-muted/30 border-border/60 focus:border-primary/50"
                        />
                        {isEditing && (
                            <p className="text-[11px] text-muted-foreground">
                                Agent ID &quot;{agent?.id}&quot; cannot be changed. This updates the display name.
                            </p>
                        )}
                    </div>

                    {/* Emoji (edit mode only) */}
                    {isEditing && (
                        <div className="space-y-2">
                            <Label htmlFor="agent-emoji" className="flex items-center gap-1.5 text-sm">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500/70" />
                                Emoji
                                <span className="text-muted-foreground">(optional)</span>
                            </Label>
                            <Input
                                id="agent-emoji"
                                placeholder="e.g. 🤖 🔬 ✍️"
                                value={emoji}
                                onChange={(e) => setEmoji(e.target.value)}
                                className="bg-muted/30 border-border/60 focus:border-primary/50"
                            />
                        </div>
                    )}

                    {/* Workspace (create only) */}
                    {!isEditing && (
                        <div className="space-y-2">
                            <Label htmlFor="agent-workspace" className="flex items-center gap-1.5 text-sm">
                                <Folder className="h-3.5 w-3.5 text-secondary/70" />
                                Workspace Directory
                            </Label>
                            <Input
                                id="agent-workspace"
                                placeholder="e.g. ~/.openclaw/workspaces/research"
                                value={workspace}
                                onChange={(e) => handleWorkspaceChange(e.target.value)}
                                className="bg-muted/30 border-border/60 focus:border-primary/50 font-mono text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                The directory where this agent&apos;s files and state are stored.
                            </p>
                        </div>
                    )}

                    {/* Model (create only) */}
                    {!isEditing && (
                        <div className="space-y-2">
                            <Label htmlFor="agent-model" className="flex items-center gap-1.5 text-sm">
                                <Cpu className="h-3.5 w-3.5 text-amber-500/70" />
                                Model
                                <span className="text-muted-foreground">(optional)</span>
                            </Label>
                            <Input
                                id="agent-model"
                                placeholder="e.g. claude-sonnet-4-20250514"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="bg-muted/30 border-border/60 focus:border-primary/50 font-mono text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Leave empty to use the default model.
                            </p>
                        </div>
                    )}

                    {/* Read-only info for edit mode */}
                    {isEditing && (agent?.workspace || agent?.model) && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground"
                        >
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500/70" />
                            <div className="space-y-1.5">
                                {agent?.workspace && (
                                    <p>
                                        <span className="font-medium text-foreground/70">Workspace:</span>{" "}
                                        <code className="font-mono">{agent.workspace}</code>
                                    </p>
                                )}
                                {agent?.model && (
                                    <p>
                                        <span className="font-medium text-foreground/70">Model:</span>{" "}
                                        <code className="font-mono">{agent.model}</code>
                                    </p>
                                )}
                                <p className="text-[10px] italic">
                                    To change model or workspace, use <code>openclaw agents add</code> interactively in the terminal.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Error */}
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

                    {/* Gateway warning */}
                    {gatewayWarning && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400"
                        >
                            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>{gatewayWarning}</p>
                        </motion.div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isSaving ||
                                (isEditing
                                    ? !name.trim() && !emoji.trim()
                                    : !name.trim() || !workspace.trim())
                            }
                            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isEditing ? "Updating…" : "Creating…"}
                                </>
                            ) : isEditing ? (
                                "Update Identity"
                            ) : (
                                "Create Agent"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
