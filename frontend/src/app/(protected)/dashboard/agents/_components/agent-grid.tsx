/**
 * Agent card grid with avatar-based design.
 * Each agent card features a large avatar image, name, and role.
 * Avatars are deterministically assigned based on agent name.
 *
 * @param agents - Array of Agent objects from the gateway
 */

"use client"

import { motion } from "framer-motion"
import { Bot } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { EmptyState } from "@/components/empty-state"
import type { Agent } from "@/lib/types/openclaw"

interface AgentGridProps {
    agents: Agent[]
}

/**
 * Deterministically assigns an avatar (1-8) based on the agent name.
 * Uses the first character's char code to ensure consistency across refreshes.
 */
function getAvatarForAgent(agentName: string): number {
    const firstChar = (agentName || "A").charAt(0).toUpperCase()
    const charCode = firstChar.charCodeAt(0)
    return ((charCode - 65) % 8) + 1
}

export function AgentGrid({ agents }: AgentGridProps) {
    if (!agents.length) {
        return (
            <EmptyState
                icon={Bot}
                title="No agents found"
                description="No agents are configured in the gateway. Check your connection or add agents via the CLI."
            />
        )
    }

    return (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {agents.map((agent, index) => {
                const avatarNumber = getAvatarForAgent(agent.name || agent.id)
                const agentName = agent.name || agent.id
                const agentRole = agent.model || "OpenClaw Agent"

                return (
                    <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            className="group relative overflow-hidden rounded-lg border border-border/50 bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 shadow-xl"
                        >
                            {/* Avatar Container */}
                            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
                                <Image
                                    src={`/avatars/${avatarNumber}.png`}
                                    alt={agentName}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                />
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            </div>

                            {/* Info Section */}
                            <div className="p-3">
                                <h3 className="text-sm font-semibold tracking-tight text-foreground truncate">
                                    {agentName}
                                </h3>
                                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                                    {agentRole}
                                </p>
                            </div>

                            {/* Hover indicator */}
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        </motion.div>
                    </Link>
                )
            })}
        </div>
    )
}
