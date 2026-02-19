/**
 * Session send API route — sends a message to a session via `sessions_send`.
 *
 * POST body:
 * - message (required): text to send
 * - sessionKey: target session key (default "main")
 * - channel: delivery channel (default "internal")
 *
 * @returns { ok: boolean; error?: string }
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { invokeGatewayTool } from "@/lib/openclaw"

interface SendBody {
    message: string
    sessionKey?: string
    channel?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    let body: SendBody

    try {
        body = (await req.json()) as SendBody
    } catch {
        return NextResponse.json(
            { ok: false, error: "Invalid JSON body" },
            { status: 400 },
        )
    }

    if (!body.message) {
        return NextResponse.json(
            { ok: false, error: "message is required" },
            { status: 400 },
        )
    }

    try {
        await invokeGatewayTool("sessions_send", {
            sessionKey: body.sessionKey ?? "main",
            message: body.message,
            channel: body.channel ?? "internal",
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send message"
        return NextResponse.json({ ok: false, error: message }, { status: 500 })
    }
}
