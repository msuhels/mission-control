/**
 * Skill Health Panel — shows Mission Control skill install status for every agent.
 *
 * Displayed on the Agents page. For each agent it shows:
 *  - Per-skill install status (tasks, reporting, feedback)
 *  - Whether SKILL.md file exists + AGENTS.md references the skill
 *  - An "Install" button if any skill is missing
 *  - An "Install All" bulk action
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import {
    CheckCircle2,
    XCircle,
    Download,
    Loader2,
    ShieldCheck,
    AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SkillDetail {
    key: string
    label: string
    hasSkillFile: boolean
    hasAgentMdRef: boolean
    installed: boolean
}

interface SkillStatus {
    agentId: string
    agentName: string
    workspace: string | null
    skills: SkillDetail[]
    allInstalled: boolean
    installed: boolean
}

interface SkillScanResult {
    agents: SkillStatus[]
    allInstalled: boolean
    canonicalSkillExists: boolean
    error?: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SkillHealthPanel() {
    const [data, setData] = useState<SkillScanResult | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [installingIds, setInstallingIds] = useState<Set<string>>(new Set())
    const [installingAll, setInstallingAll] = useState(false)

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/agents/skills")
            const json = await res.json()
            if (json.error) {
                setData({
                    agents: [],
                    allInstalled: false,
                    canonicalSkillExists: false,
                    error: json.error,
                })
            } else {
                setData(json)
            }
        } catch {
            setData({
                agents: [],
                allInstalled: false,
                canonicalSkillExists: false,
                error: "Failed to fetch skill status",
            })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    const installForAgents = useCallback(
        async (agentIds: string[]) => {
            try {
                const res = await fetch("/api/agents/skills", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ agentIds }),
                })
                await res.json()
                // Refresh status
                await fetchStatus()
            } catch {
                // Will be visible on next refresh
            }
        },
        [fetchStatus],
    )

    const handleInstallOne = useCallback(
        async (agentId: string) => {
            setInstallingIds((prev) => new Set(prev).add(agentId))
            await installForAgents([agentId])
            setInstallingIds((prev) => {
                const next = new Set(prev)
                next.delete(agentId)
                return next
            })
        },
        [installForAgents],
    )

    const handleInstallAll = useCallback(async () => {
        if (!data) return
        const missing = data.agents
            .filter((a) => !a.allInstalled && a.workspace)
            .map((a) => a.agentId)
        if (!missing.length) return

        setInstallingAll(true)
        await installForAgents(missing)
        setInstallingAll(false)
    }, [data, installForAgents])

    /* -------------------------------------------------------------- */
    /*  Render                                                         */
    /* -------------------------------------------------------------- */

    if (isLoading) {
        return (
            <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                        Scanning agent workspaces for skills…
                    </span>
                </div>
            </div>
        )
    }

    if (data?.error) {
        return (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                        <p className="text-sm font-medium text-destructive">
                            Skill scan failed
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {data.error}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!data || data.agents.length === 0) return null

    const missingCount = data.agents.filter(
        (a) => !a.allInstalled && a.workspace,
    ).length
    const noWorkspaceCount = data.agents.filter((a) => !a.workspace).length

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg",
                            data.allInstalled
                                ? "bg-status-done-badge-bg"
                                : "bg-status-review-badge-bg",
                        )}
                    >
                        <ShieldCheck
                            className={cn(
                                "h-5 w-5",
                                data.allInstalled
                                    ? "text-status-done-badge-fg"
                                    : "text-status-review-badge-fg",
                            )}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">
                            Mission Control Skills
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {data.allInstalled
                                ? "All skills installed on all agents"
                                : `${missingCount} agent${missingCount !== 1 ? "s" : ""} missing one or more skills`}
                        </p>
                    </div>
                </div>

                {missingCount > 0 && (
                    <button
                        onClick={handleInstallAll}
                        disabled={installingAll}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                            "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                        )}
                    >
                        {installingAll ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Download className="h-3.5 w-3.5" />
                        )}
                        Install All ({missingCount})
                    </button>
                )}
            </div>

            {/* Agent list */}
            <div className="divide-y divide-border/50">
                {data.agents.map((agent) => {
                    const isInstalling = installingIds.has(agent.agentId)
                    const hasNoWorkspace = !agent.workspace

                    return (
                        <div
                            key={agent.agentId}
                            className={cn(
                                "flex items-center justify-between px-5 py-3 transition-colors",
                                agent.allInstalled
                                    ? "bg-card"
                                    : "bg-muted/20",
                            )}
                        >
                            {/* Agent info */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0",
                                        agent.allInstalled
                                            ? "bg-status-done-badge-bg text-status-done-badge-fg"
                                            : hasNoWorkspace
                                                ? "bg-muted text-muted-foreground"
                                                : "bg-status-review-badge-bg text-status-review-badge-fg",
                                    )}
                                >
                                    {agent.agentName
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {agent.agentName}
                                    </p>
                                    {hasNoWorkspace ? (
                                        <p className="text-[10px] text-muted-foreground">
                                            No workspace configured
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                                            {agent.workspace}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Per-skill status indicators */}
                            <div className="flex items-center gap-4">
                                {!hasNoWorkspace && agent.skills && (
                                    <div className="flex items-center gap-3">
                                        {agent.skills.map((skill) => (
                                            <div
                                                key={skill.key}
                                                className="flex items-center gap-1"
                                                title={`${skill.label}: ${skill.installed ? "Installed" : "Missing"}`}
                                            >
                                                {skill.installed ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-status-done" />
                                                ) : (
                                                    <XCircle className="h-3.5 w-3.5 text-destructive/60" />
                                                )}
                                                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                                    {skill.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Action button */}
                                {agent.allInstalled ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-done-badge-bg px-3 py-1 text-[10px] font-bold text-status-done-badge-fg">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Installed
                                    </span>
                                ) : hasNoWorkspace ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[10px] font-bold text-muted-foreground">
                                        N/A
                                    </span>
                                ) : (
                                    <button
                                        onClick={() =>
                                            handleInstallOne(agent.agentId)
                                        }
                                        disabled={isInstalling}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all",
                                            "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
                                            "disabled:opacity-50 disabled:cursor-not-allowed",
                                        )}
                                    >
                                        {isInstalling ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Download className="h-3 w-3" />
                                        )}
                                        Install
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Footer note */}
            {noWorkspaceCount > 0 && (
                <div className="border-t border-border px-5 py-3 bg-muted/10">
                    <p className="text-[10px] text-muted-foreground">
                        <strong>{noWorkspaceCount}</strong> agent
                        {noWorkspaceCount !== 1 ? "s" : ""} without a
                        workspace cannot have skills installed. Configure a
                        workspace via the OpenClaw CLI.
                    </p>
                </div>
            )}
        </div>
    )
}
