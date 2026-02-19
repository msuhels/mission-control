"use client"

import { Handle, Position } from "@xyflow/react"
import { Folder, Cpu, MessageSquare, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import type { AgentNodeData, ChannelNodeData } from "./types"

/**
 * Deterministically assigns an avatar (1-8) based on the agent name.
 */
function getAvatarForAgent(agentName: string): number {
    const firstChar = (agentName || "A").charAt(0).toUpperCase()
    const charCode = firstChar.charCodeAt(0)
    return ((charCode - 65) % 8) + 1
}

export function AgentNode({ data }: { data: AgentNodeData }) {
    const avatarNumber = getAvatarForAgent(data.name)

    return (
        <div className="relative w-[220px] overflow-hidden rounded-lg bg-card border border-border/50 shadow-md transition-all hover:shadow-lg hover:border-primary/30">
            {/* Avatar */}
            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
                <Image
                    src={`/avatars/${avatarNumber}.png`}
                    alt={data.name}
                    fill
                    className="object-cover"
                    sizes="220px"
                />
                {data.isDefault && (
                    <div className="absolute top-2 right-2">
                        <Badge className="h-5 px-2 text-[9px] bg-primary/90 text-primary-foreground border-0 shadow-lg">
                            DEFAULT
                        </Badge>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3">
                <h3 className="font-semibold truncate text-sm">
                    {data.name}
                </h3>
                <div className="text-[10px] text-muted-foreground font-mono truncate opacity-70 mt-0.5">
                    {data.id}
                </div>

                <div className="space-y-1 pt-2 mt-2 border-t border-border/40">
                    {data.workspace && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Folder className="h-3 w-3 shrink-0 opacity-60" />
                            <span className="truncate font-mono opacity-80">{data.workspace}</span>
                        </div>
                    )}
                    {data.model && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Cpu className="h-3 w-3 shrink-0 opacity-60" />
                            <span className="truncate font-medium opacity-80">{data.model}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Source handle for outgoing connections */}
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-muted-foreground !w-2 !h-2 !border-2 !border-background hover:!bg-primary transition-colors"
            />

            {/* Target handle for incoming connections (if needed in future) */}
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-muted-foreground !w-2 !h-2 !border-2 !border-background hover:!bg-primary transition-colors"
            />
        </div>
    )
}

export function ChannelNode({ data }: { data: ChannelNodeData }) {
    const isChannel = data.type === 'channel'

    return (
        <div className="relative min-w-[180px] max-w-[240px] px-3 py-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors group">
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-muted-foreground !w-1.5 !h-1.5 !border-background group-hover:!bg-primary transition-colors"
            />

            <div className="flex items-center gap-2.5">
                <div className={`flex items-center justify-center w-7 h-7 rounded-md ${isChannel ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {isChannel ? <MessageSquare className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{data.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate opacity-70 font-mono">
                        {data.details}
                    </div>
                </div>
            </div>
        </div>
    )
}
