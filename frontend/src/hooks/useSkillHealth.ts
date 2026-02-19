/**
 * useSkillHealth — polls the skill health API and fires a sonner toast warning
 * when one or more agents are missing the Mission Control skill.
 *
 * The toast includes an actionable "Fix All" button that triggers installation.
 * Only fires the toast once per mount to avoid spamming.
 */

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface SkillStatus {
    agentId: string
    agentName: string
    workspace: string | null
    hasSkillFile: boolean
    hasAgentMdRef: boolean
    installed: boolean
}

interface SkillScanResult {
    agents: SkillStatus[]
    allInstalled: boolean
    canonicalSkillExists: boolean
    error?: string
}

export function useSkillHealth() {
    const [data, setData] = useState<SkillScanResult | null>(null)
    const [isFixing, setIsFixing] = useState(false)
    const toastFiredRef = useRef(false)

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/agents/skills")
            const json: SkillScanResult = await res.json()
            setData(json)
            return json
        } catch {
            return null
        }
    }, [])

    const fixAll = useCallback(async () => {
        if (!data) return
        const missing = data.agents
            .filter((a) => !a.installed && a.workspace)
            .map((a) => a.agentId)

        if (!missing.length) return

        setIsFixing(true)
        try {
            const res = await fetch("/api/agents/skills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentIds: missing }),
            })
            const result = await res.json()

            if (result.allSucceeded) {
                toast.success("Mission Control skill installed", {
                    description: `Installed on ${missing.length} agent${missing.length !== 1 ? "s" : ""} successfully.`,
                    duration: 4000,
                })
            } else {
                const failed = (result.results ?? []).filter(
                    (r: { success: boolean }) => !r.success,
                )
                toast.error("Some installations failed", {
                    description: `${failed.length} agent${failed.length !== 1 ? "s" : ""} could not be updated. Check workspace access.`,
                    duration: 6000,
                })
            }

            // Refresh data
            await fetchStatus()
        } catch {
            toast.error("Install failed", {
                description: "Could not reach the skills API.",
                duration: 5000,
            })
        } finally {
            setIsFixing(false)
        }
    }, [data, fetchStatus])

    // Initial fetch + toast
    useEffect(() => {
        fetchStatus().then((result) => {
            if (
                !toastFiredRef.current &&
                result &&
                !result.allInstalled &&
                !result.error
            ) {
                const missingAgents = result.agents.filter(
                    (a) => !a.installed && a.workspace,
                )
                if (missingAgents.length > 0) {
                    toastFiredRef.current = true

                    const names = missingAgents
                        .map((a) => a.agentName)
                        .join(", ")

                    toast.warning("Agents missing Mission Control skill", {
                        description: `${missingAgents.length} agent${missingAgents.length !== 1 ? "s" : ""} don't have the task management skill: ${names}`,
                        duration: 12000,
                        action: {
                            label: "Fix All",
                            onClick: () => {
                                // We need to trigger fix through a global event
                                // since the toast callback doesn't have access to latest state
                                window.dispatchEvent(
                                    new CustomEvent(
                                        "mc:fix-skills",
                                    ),
                                )
                            },
                        },
                    })
                }
            }
        })
    }, [fetchStatus])

    // Listen for fix event from toast
    useEffect(() => {
        const handler = () => {
            fixAll()
        }
        window.addEventListener("mc:fix-skills", handler)
        return () => window.removeEventListener("mc:fix-skills", handler)
    }, [fixAll])

    return {
        data,
        isFixing,
        fixAll,
        refetch: fetchStatus,
    }
}
