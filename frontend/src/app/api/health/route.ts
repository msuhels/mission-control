/**
 * Health check API route.
 *
 * The gateway doesn't have a dedicated /health JSON endpoint.
 * Instead we invoke a lightweight tool (`agents_list`) and check if it succeeds.
 *
 * @returns { ok: boolean; error?: string }
 */

import { NextResponse } from "next/server"

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://127.0.0.1:18789"
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN ?? ""

export async function GET(): Promise<NextResponse> {
    try {
        const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {}),
            },
            body: JSON.stringify({ tool: "agents_list", args: {} }),
            cache: "no-store",
            signal: AbortSignal.timeout(3000),
        })

        const data = await res.json()
        return NextResponse.json({ ok: Boolean(data?.ok) })
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ ok: false, error: message })
    }
}
