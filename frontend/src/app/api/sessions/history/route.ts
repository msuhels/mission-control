/**
 * Session history API route — fetches message history for a session.
 *
 * Uses the `sessions_history` tool.
 * Response shape from gateway: { messages: [...] }
 *
 * Query params:
 * - sessionKey (required): session key
 * - limit: max messages
 * - includeTools: include tool results (default false)
 *
 * @returns SessionMessage[]
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { invokeGatewayTool } from "@/lib/openclaw"
import type { SessionMessage } from "@/lib/types/openclaw"

interface SessionsHistoryResult {
    messages: SessionMessage[]
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = req.nextUrl

    const sessionKey = searchParams.get("sessionKey")
    if (!sessionKey) {
        return NextResponse.json(
            { error: "sessionKey is required" },
            { status: 400 },
        )
    }

    const args: Record<string, unknown> = { sessionKey }

    const limit = searchParams.get("limit")
    if (limit) args.limit = Number(limit)

    const includeTools = searchParams.get("includeTools")
    if (includeTools === "true") args.includeTools = true

    try {
        const data = await invokeGatewayTool<SessionsHistoryResult>(
            "sessions_history",
            args,
        )
        return NextResponse.json(data.messages ?? [])
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch history"
        console.error("[API /sessions/history]:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
