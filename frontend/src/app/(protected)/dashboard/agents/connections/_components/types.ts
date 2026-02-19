export type AgentNodeData = {
    id: string
    name: string
    emoji?: string
    isDefault: boolean
    workspace?: string
    model?: string
}

export type ChannelNodeData = {
    label: string
    type: "channel" | "account"
    details: string
}
