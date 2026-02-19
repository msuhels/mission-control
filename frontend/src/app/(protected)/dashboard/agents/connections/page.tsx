/**
 * Agent Connections Diagram using React Flow.
 * Visualizes the relationships between agents and their bound channels/accounts.
 */

"use client"

import { useEffect, useState, useMemo } from "react"
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    Position,
    MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { AgentNode, ChannelNode } from "./_components/custom-nodes"
import type { Agent } from "@/lib/types/openclaw"
import { useTheme } from "next-themes"

// Layout configuration
const AGENT_X = 100
const AGENT_Y_START = 100
const AGENT_Y_GAP = 320

const CHANNEL_X = 600
const CHANNEL_Y_START = 100
const CHANNEL_Y_GAP = 160

export default function ConnectionsPage() {
    const { theme } = useTheme()
    const [agents, setAgents] = useState<Agent[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // React Flow state
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

    const nodeTypes = useMemo(
        () => ({
            agent: AgentNode,
            channel: ChannelNode,
        }),
        []
    )

    // Load agent data
    useEffect(() => {
        fetch("/api/agents")
            .then((res) => res.json())
            .then((data) => {
                setAgents(Array.isArray(data) ? data : data.agents ?? [])
            })
            .catch(() => setAgents([]))
            .finally(() => setIsLoading(false))
    }, [])

    // Transform agents -> graph
    useEffect(() => {
        if (isLoading) return

        const newNodes: Node[] = []
        const newEdges: Edge[] = []

        // 1. Create Agent Nodes (Left Column)
        agents.forEach((agent, index) => {
            newNodes.push({
                id: `agent-${agent.id}`,
                type: "agent",
                position: { x: AGENT_X, y: AGENT_Y_START + index * AGENT_Y_GAP },
                data: {
                    id: agent.id,
                    name: agent.name || agent.id,
                    emoji: agent.emoji,
                    isDefault: agent.default,
                    workspace: agent.workspace,
                    model: agent.model,
                },
            })
        })

        // 2. Create Channel Nodes (Right Column)
        // We need to deduplicate channels to avoid clutter?
        // For simplicity, let's list every unique binding target.
        let channelIndex = 0
        const createdChannelIds = new Set<string>()

        agents.forEach((agent) => {
            if (!agent.bindings) return

            agent.bindings.forEach((binding, bIndex) => {
                // Construct a unique ID for the channel node based on its properties
                // Fallback to generic if properties missing
                const match = binding.match
                const channelName = match?.channel || "default"
                const accountId = match?.accountId || match?.peer?.id || "any"

                const channelNodeId = `channel-${channelName}-${accountId}`
                const label = channelName
                const details = accountId !== "any" ? accountId : "Global / Any"

                // Create channel node if it doesn't exist yet
                if (!createdChannelIds.has(channelNodeId)) {
                    createdChannelIds.add(channelNodeId)
                    newNodes.push({
                        id: channelNodeId,
                        type: "channel",
                        position: {
                            x: CHANNEL_X,
                            y: CHANNEL_Y_START + channelIndex * CHANNEL_Y_GAP,
                        },
                        data: {
                            label,
                            type: "channel",
                            details,
                        },
                    })
                    channelIndex++
                }

                // Create Edge from Agent -> Channel
                newEdges.push({
                    id: `edge-${agent.id}-${channelNodeId}-${bIndex}`,
                    source: `agent-${agent.id}`,
                    target: channelNodeId,
                    type: "default",
                    animated: true,
                    style: { stroke: "var(--primary)", strokeWidth: 2, opacity: 0.6 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: "var(--primary)",
                    },
                })
            })
        })

        setNodes(newNodes)
        setEdges(newEdges)
    }, [agents, isLoading, setNodes, setEdges])

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            <PageHeader
                title="Agent Connections"
                description="Visual map of agent bindings and channel routing."
            >
                <Link href="/dashboard/agents">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Agents
                    </Button>
                </Link>
            </PageHeader>

            <div className="flex-1 w-full min-h-0 border-t border-border/40 bg-muted/5 relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        colorMode={theme === "dark" ? "dark" : "light"}
                        fitView
                        attributionPosition="bottom-right"
                        minZoom={0.5}
                        maxZoom={1.5}
                    >
                        <Background color="var(--border)" gap={20} size={1} />
                        <Controls className="bg-background border-border" />
                    </ReactFlow>
                )}

                {!isLoading && agents.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-muted-foreground font-medium">No agents configured.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
