/**
 * Agents page — displays all configured agents as cards.
 * Includes Create Agent button, skill health panel, and supports agent CRUD.
 */

"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Network, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { AgentGrid } from "./_components/agent-grid"
import { AgentFormDialog } from "./_components/agent-form-dialog"
import { SkillHealthPanel } from "./_components/skill-health-panel"
import type { Agent } from "@/lib/types/openclaw"

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)


    useEffect(() => {
        fetch("/api/agents")
            .then((res) => res.json())
            .then((data) => {
                setAgents(Array.isArray(data) ? data : data.agents ?? [])
            })
            .catch(() => setAgents([]))
            .finally(() => setIsLoading(false))
    }, [])

    return (
        <>
            <PageHeader
                title="Agents"
                description="All configured OpenClaw agents."
            >
                <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowCreate(true)}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Agent
                </Button>
                <Link href="/dashboard/agents/connections">
                    <Button variant="outline" size="sm">
                        <Network className="mr-2 h-4 w-4" />
                        View Connections
                    </Button>
                </Link>
            </PageHeader>

            {/* Skill health check — shows install status per agent */}
            <SkillHealthPanel />

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <AgentGrid agents={agents} />
            )}

            <AgentFormDialog
                open={showCreate}
                onOpenChange={setShowCreate}
                onSuccess={(updatedAgents) => setAgents(updatedAgents)}
            />
        </>
    )
}

