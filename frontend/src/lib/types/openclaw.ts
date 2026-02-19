/**
 * Shared TypeScript types for the OpenClaw gateway integration.
 *
 * All types mirror the gateway's JSON wire format.
 * Gateway timestamps are epoch milliseconds (not seconds).
 */

/* ------------------------------------------------------------------ */
/*  Gateway Envelope                                                   */
/* ------------------------------------------------------------------ */

export interface GatewayContentBlock {
    type: "text"
    text: string
}

export interface GatewayResult {
    content: GatewayContentBlock[]
    details?: Record<string, unknown>
}

export interface GatewayEnvelope {
    ok: boolean
    result: GatewayResult
}

/* ------------------------------------------------------------------ */
/*  Agent                                                              */
/* ------------------------------------------------------------------ */

export interface Agent {
    id: string
    name?: string
    configured: boolean
    workspace?: string
    agentDir?: string
    model?: string
    default?: boolean
    bindings?: AgentBinding[]
    emoji?: string
    theme?: string
    avatar?: string
}

export interface AgentBinding {
    agentId: string
    match?: {
        channel?: string
        peer?: {
            kind?: string
            id?: string
        }
        accountId?: string
    }
}

/* ------------------------------------------------------------------ */
/*  Session                                                            */
/* ------------------------------------------------------------------ */

export interface Session {
    key: string
    kind: "main" | "group" | "cron" | "hook" | "node" | "other"
    channel: string
    displayName?: string
    updatedAt: number
    sessionId: string
    model?: string
    contextTokens?: number
    totalTokens?: number
    thinkingLevel?: string
    verboseLevel?: string
    systemSent?: boolean
    abortedLastRun?: boolean
    sendPolicy?: string
    lastChannel?: string
    lastTo?: string
    deliveryContext?: {
        channel?: string
        to?: string
        accountId?: string
    }
    transcriptPath?: string
    messages?: SessionMessage[]
}

export interface SessionMessage {
    role: "user" | "assistant" | "system" | "toolResult"
    content: string | MessageContentPart[]
    timestamp?: number
    model?: string
}

export interface MessageContentPart {
    type: "text" | "image" | "tool_use" | "tool_result"
    text?: string
}

/* ------------------------------------------------------------------ */
/*  Cron Job                                                           */
/* ------------------------------------------------------------------ */

export interface CronSchedule {
    kind: "at" | "every" | "cron"
    at?: string
    everyMs?: number
    expr?: string
    tz?: string
}

export interface CronPayload {
    kind: "systemEvent" | "agentTurn"
    text?: string
    message?: string
}

export interface CronDelivery {
    mode: "announce" | "webhook" | "none"
    channel?: string
    to?: string
    bestEffort?: boolean
}

export interface CronJob {
    id: string
    jobId?: string
    name: string
    description?: string
    enabled: boolean
    schedule: CronSchedule
    sessionTarget: "main" | "isolated"
    wakeMode?: "now" | "next-heartbeat"
    payload: CronPayload
    delivery?: CronDelivery
    agentId?: string
    deleteAfterRun?: boolean
    lastRun?: number
    nextRun?: number
    createdAt?: number
}

/* ------------------------------------------------------------------ */
/*  Workspace Files                                                    */
/* ------------------------------------------------------------------ */

export interface WorkspaceFile {
    name: string
    path: string
    date: string
    agentId: string
}

export interface WorkspaceFileContent {
    path: string
    content: string
}

/* ------------------------------------------------------------------ */
/*  Health                                                             */
/* ------------------------------------------------------------------ */

export interface HealthStatus {
    ok: boolean
    error?: string
}

/* ------------------------------------------------------------------ */
/*  Chat                                                               */
/* ------------------------------------------------------------------ */

export interface ChatSendRequest {
    message: string
    sessionKey?: string
    agentId?: string
}

export interface ChatSendResponse {
    ok: boolean
    error?: string
}
