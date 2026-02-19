/**
 * Sessions API route — lists sessions via the `sessions_list` gateway tool.
 *
 * Response shape from gateway: { count, sessions: [...] }
 *
 * Query params:
 * - kinds: comma-separated session kinds (main,group,cron,hook,node,other)
 * - limit: max number of sessions
 * - activeMinutes: only sessions updated within N minutes
 * - messageLimit: include last N messages per session (default 0)
 *
 * @returns Session[]
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { invokeGatewayTool } from "@/lib/openclaw"
import type { Session } from "@/lib/types/openclaw"

interface SessionsListResult {
    count: number
    sessions: Session[]
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = req.nextUrl

    const args: Record<string, unknown> = {}

    const kinds = searchParams.get("kinds")
    if (kinds) {
        args.kinds = kinds.split(",").filter(Boolean)
    }

    const limit = searchParams.get("limit")
    if (limit) args.limit = Number(limit)

    const activeMinutes = searchParams.get("activeMinutes")
    if (activeMinutes) args.activeMinutes = Number(activeMinutes)

    const messageLimit = searchParams.get("messageLimit")
    if (messageLimit) args.messageLimit = Number(messageLimit)

    try {
        const data = await invokeGatewayTool<SessionsListResult>("sessions_list", args)
        return NextResponse.json(data.sessions ?? [])
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch sessions"
        console.error("[API /sessions]:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
