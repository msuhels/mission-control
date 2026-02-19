/**
 * Server-side OpenClaw gateway client.
 *
 * All calls to the gateway route through this module so credentials
 * never leak to the browser.  The gateway wraps every tool result in
 * an envelope: `{ ok, result: { content: [{ type: "text", text: "<JSON>" }], details } }`.
 * Use `unwrapGatewayResponse` to extract the inner payload.
 *
 * @example
 * const sessions = await invokeGatewayTool<SessionsListResult>("sessions_list", { limit: 50 })
 */

import type { GatewayEnvelope } from "@/lib/types/openclaw"

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://127.0.0.1:18789"
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN ?? ""

/* ------------------------------------------------------------------ */
/*  Envelope unwrap                                                    */
/* ------------------------------------------------------------------ */

/**
 * Extracts the parsed JSON payload from a gateway envelope.
 *
 * The gateway wraps responses as:
 * `{ ok, result: { content: [{ type: "text", text: "<JSON>" }], details: <already parsed> } }`
 *
 * We prefer `details` (already parsed) over `content[0].text` (string).
 *
 * @param envelope - Raw gateway response object
 * @returns Parsed inner payload of type T
 */
export function unwrapGatewayResponse<T = unknown>(envelope: GatewayEnvelope): T {
    if (!envelope.ok) {
        const raw = envelope as unknown as { error?: { message?: string } }
        const errMsg = raw.error?.message ?? "Gateway returned ok:false"
        throw new Error(errMsg)
    }

    // Prefer `.details` (pre-parsed object) if available
    if (envelope.result?.details !== undefined && envelope.result?.details !== null) {
        return envelope.result.details as T
    }

    // Fall back to parsing the text content block
    const block = envelope.result?.content?.[0]
    if (!block || block.type !== "text") {
        throw new Error("Unexpected gateway content format")
    }

    return JSON.parse(block.text) as T
}

/* ------------------------------------------------------------------ */
/*  Tool invocation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Invokes a gateway tool via the `/tools/invoke` HTTP endpoint.
 *
 * @param tool  - Tool name (e.g. "sessions_list", "cron")
 * @param args  - Tool arguments
 * @returns Parsed inner payload of type T
 *
 * @example
 * const data = await invokeGatewayTool<{ count: number; sessions: Session[] }>("sessions_list", {})
 */
export async function invokeGatewayTool<T = unknown>(
    tool: string,
    args: Record<string, unknown> = {},
): Promise<T> {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {}),
        },
        body: JSON.stringify({ tool, args }),
        cache: "no-store",
    })

    if (!res.ok) {
        const text = await res.text().catch(() => "")
        // Try to parse error JSON from the gateway
        try {
            const errData = JSON.parse(text) as { error?: { message?: string } }
            if (errData?.error?.message) {
                throw new Error(errData.error.message)
            }
        } catch (e) {
            if (e instanceof Error && e.message !== text) {
                throw e
            }
        }
        throw new Error(`Gateway error ${res.status}: ${text}`)
    }

    const envelope = (await res.json()) as GatewayEnvelope
    return unwrapGatewayResponse<T>(envelope)
}

/* ------------------------------------------------------------------ */
/*  Health check                                                       */
/* ------------------------------------------------------------------ */

/**
 * Checks gateway reachability by invoking a lightweight tool.
 *
 * @returns `{ ok: true }` when healthy, `{ ok: false, error }` otherwise
 */
export async function checkGatewayHealth(): Promise<{ ok: boolean; error?: string }> {
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

        const data = (await res.json()) as { ok?: boolean }
        return { ok: Boolean(data?.ok) }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return { ok: false, error: message }
    }
}
