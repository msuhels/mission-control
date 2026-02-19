/**
 * Agent detail page — shows agent info with tabbed sections.
 * Tabs: Sessions, Usage, Logs, Scheduling (Cron)
 * Includes Edit and Delete actions.
 */

"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import {
    Bot,
    ArrowLeft,
    Folder,
    Cpu,
    Sparkles,
    Loader2,
    Radio,
    BarChart3,
    ScrollText,
    CalendarClock,
    Pencil,
    Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GradientIcon } from "@/components/gradient-icon"
import type { Agent, Session, CronJob } from "@/lib/types/openclaw"
import { AgentSessionsTab } from "./_components/agent-sessions-tab"
import { AgentUsageTab } from "./_components/agent-usage-tab"
import { AgentLogsTab } from "./_components/agent-logs-tab"
import { AgentCronTab } from "./_components/agent-cron-tab"
import { AgentFormDialog } from "../_components/agent-form-dialog"
import { AgentDeleteDialog } from "../_components/agent-delete-dialog"

/**
 * Deterministically assigns an avatar (1-8) based on the agent name.
 */
function getAvatarForAgent(agentName: string): number {
    const firstChar = (agentName || "A").charAt(0).toUpperCase()
    const charCode = firstChar.charCodeAt(0)
    return ((charCode - 65) % 8) + 1
}

export default function AgentDetailPage() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const agentId = params.id

    const [agent, setAgent] = useState<Agent | null>(null)
    const [sessions, setSessions] = useState<Session[]>([])
    const [cronJobs, setCronJobs] = useState<CronJob[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Dialog state
    const [showEdit, setShowEdit] = useState(false)
    const [showDelete, setShowDelete] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const [agentsRes, sessionsRes, cronRes] = await Promise.all([
                    fetch("/api/agents"),
                    fetch("/api/sessions?limit=200"),
                    fetch("/api/cron"),
                ])

                const agents: Agent[] = await agentsRes.json()
                const allSessions: Session[] = await sessionsRes.json()
                const allCron: CronJob[] = await cronRes.json()

                const found = agents.find(
                    (a) => a.id.toLowerCase() === agentId.toLowerCase()
                )
                setAgent(found ?? null)

                // Filter sessions: key starts with "agent:<id>:" or
                // for default agent, include unscoped sessions too
                const agentSessions = allSessions.filter((s) => {
                    const key = s.key?.toLowerCase() ?? ""
                    if (key.startsWith(`agent:${agentId.toLowerCase()}:`)) {
                        return true
                    }
                    // Default agent owns sessions without agent: prefix
                    if (found?.default && !key.startsWith("agent:")) {
                        return true
                    }
                    return false
                })
                setSessions(agentSessions)

                // Filter cron jobs by agentId
                const agentCron = allCron.filter((j) => {
                    const jAgent = (j.agentId ?? "main").toLowerCase()
                    return jAgent === agentId.toLowerCase()
                })
                setCronJobs(agentCron)
            } catch {
                setAgent(null)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [agentId])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!agent) {
        return (
            <>
                <PageHeader title="Agent Not Found" description={`No agent with ID "${agentId}" was found.`}>
                    <Link href="/dashboard/agents">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Agents
                        </Button>
                    </Link>
                </PageHeader>
            </>
        )
    }

    return (
        <>
            <PageHeader
                title={agent.name || agent.id}
                description={`Agent details and activity for "${agent.id}".`}
            >
                <Link href="/dashboard/agents">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Agents
                    </Button>
                </Link>
            </PageHeader>

            {/* Agent Info Card */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-6 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm"
            >
                <div className="flex flex-wrap items-center gap-4 p-5">
                    {/* Avatar */}
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border/50 bg-gradient-to-br from-muted/50 to-muted shrink-0">
                        <Image
                            src={`/avatars/${getAvatarForAgent(agent.name || agent.id)}.png`}
                            alt={agent.name || agent.id}
                            fill
                            className="object-cover"
                            sizes="64px"
                        />
                        {agent.default && (
                            <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                        )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">
                                {agent.name || agent.id}
                            </h2>
                            {agent.default && (
                                <Badge className="bg-gradient-to-r from-primary/90 to-primary text-primary-foreground text-[10px] border-0">
                                    <Sparkles className="mr-1 h-2.5 w-2.5" />
                                    Default
                                </Badge>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {agent.workspace && (
                                <span className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
                                    <Folder className="h-3 w-3 text-primary/70" />
                                    <span className="font-mono">{agent.workspace}</span>
                                </span>
                            )}
                            {agent.model && (
                                <span className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
                                    <Cpu className="h-3 w-3 text-secondary/70" />
                                    <span className="font-medium">{agent.model}</span>
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5">
                                <Radio className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="font-semibold text-foreground">{sessions.length}</span>
                                sessions
                            </span>
                            <span className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5">
                                <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
                                <span className="font-semibold text-foreground">{cronJobs.length}</span>
                                cron jobs
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-border/50" />

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                                    onClick={() => setShowEdit(true)}
                                >
                                    <Pencil className="mr-1.5 h-3 w-3 text-primary" />
                                    Edit
                                </Button>
                            </motion.div>
                            {!agent.default && (
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setShowDelete(true)}
                                    >
                                        <Trash2 className="mr-1.5 h-3 w-3" />
                                        Delete
                                    </Button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <Tabs defaultValue="sessions">
                <TabsList className="mb-4 w-full sm:w-auto">
                    <TabsTrigger value="sessions" className="gap-1.5">
                        <Radio className="h-3.5 w-3.5" />
                        Sessions
                    </TabsTrigger>
                    <TabsTrigger value="usage" className="gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Usage
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="gap-1.5">
                        <ScrollText className="h-3.5 w-3.5" />
                        Logs
                    </TabsTrigger>
                    <TabsTrigger value="scheduling" className="gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Scheduling
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="sessions">
                    <AgentSessionsTab sessions={sessions} />
                </TabsContent>

                <TabsContent value="usage">
                    <AgentUsageTab sessions={sessions} agent={agent} />
                </TabsContent>

                <TabsContent value="logs">
                    <AgentLogsTab sessions={sessions} />
                </TabsContent>

                <TabsContent value="scheduling">
                    <AgentCronTab jobs={cronJobs} />
                </TabsContent>
            </Tabs>

            {/* Edit Dialog */}
            <AgentFormDialog
                open={showEdit}
                onOpenChange={setShowEdit}
                agent={agent}
                onSuccess={(updatedAgents) => {
                    const updated = updatedAgents.find(
                        (a) => a.id.toLowerCase() === agentId.toLowerCase()
                    )
                    if (updated) setAgent(updated)
                }}
            />

            {/* Delete Dialog */}
            <AgentDeleteDialog
                open={showDelete}
                onOpenChange={setShowDelete}
                agent={agent}
                onSuccess={() => {
                    router.push("/dashboard/agents")
                }}
            />
        </>
    )
}
