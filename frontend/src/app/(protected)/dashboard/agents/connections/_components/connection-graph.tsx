/**
 * Connection graph — visual representation of agent-to-agent connections
 * through bindings and shared channels.
 *
 * @param agents - Array of Agent objects
 */

"use client"

import { Network, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import type { Agent } from "@/lib/types/openclaw"

interface ConnectionGraphProps {
    agents: Agent[]
}

interface Connection {
    from: string
    to: string
    channel: string
    peerId?: string
}

function extractConnections(agents: Agent[]): Connection[] {
    const connections: Connection[] = []

    for (const agent of agents) {
        if (!agent.bindings) continue

        for (const binding of agent.bindings) {
            if (binding.agentId && binding.agentId !== agent.id) {
                connections.push({
                    from: agent.id,
                    to: binding.agentId,
                    channel: binding.match?.channel ?? "any",
                    peerId: binding.match?.peer?.id,
                })
            }
        }
    }

    return connections
}

export function ConnectionGraph({ agents }: ConnectionGraphProps) {
    const connections = extractConnections(agents)

    if (agents.length <= 1 && connections.length === 0) {
        return (
            <EmptyState
                icon={Network}
                title="Single agent setup"
                description="You have a single-agent configuration. Add more agents to see their connections."
            />
        )
    }

    return (
        <div className="space-y-6">
            {/* Agent nodes */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => {
                    const outgoing = connections.filter((c) => c.from === agent.id)
                    const incoming = connections.filter((c) => c.to === agent.id)

                    return (
                        <Card key={agent.id} className="relative">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                                        <Network className="h-4 w-4 text-primary" />
                                    </div>
                                    {agent.id}
                                    {agent.default && (
                                        <Badge variant="secondary" className="text-[10px]">
                                            Default
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {outgoing.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Routes to
                                        </p>
                                        {outgoing.map((conn, i) => (
                                            <div
                                                key={`out-${i}`}
                                                className="flex items-center gap-2 text-xs"
                                            >
                                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-medium">{conn.to}</span>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {conn.channel}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {incoming.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Receives from
                                        </p>
                                        {incoming.map((conn, i) => (
                                            <div
                                                key={`in-${i}`}
                                                className="flex items-center gap-2 text-xs"
                                            >
                                                <ArrowRight className="h-3 w-3 rotate-180 text-muted-foreground" />
                                                <span className="font-medium">{conn.from}</span>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {conn.channel}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {outgoing.length === 0 && incoming.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        No direct connections
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Connection summary */}
            {connections.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Connection Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {connections.map((conn, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 rounded-md border p-3 text-sm"
                                >
                                    <span className="font-medium">{conn.from}</span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{conn.to}</span>
                                    <Badge variant="outline">{conn.channel}</Badge>
                                    {conn.peerId && (
                                        <span className="text-xs text-muted-foreground">
                                            ({conn.peerId})
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
