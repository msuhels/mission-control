/**
 * Cron API route — manages cron jobs via the gateway `cron` tool.
 *
 * The gateway tool is named "cron" and uses an `action` field:
 *   - action: "list"   → list jobs
 *   - action: "status" → scheduler status
 *   - action: "add"    → add job (requires `job` object)
 *   - action: "run"    → trigger job (requires `jobId`)
 *   - action: "remove" → delete job (requires `jobId`)
 *   - action: "update" → modify job (requires `jobId` + `patch`)
 *   - action: "runs"   → job run history (requires `jobId`)
 *
 * GET  → lists all cron jobs
 * POST → executes action
 *
 * @returns CronJob[] | { ok: boolean }
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { invokeGatewayTool } from "@/lib/openclaw"
import type { CronJob } from "@/lib/types/openclaw"

interface CronListResult {
    jobs: CronJob[]
}

export async function GET(): Promise<NextResponse> {
    try {
        const data = await invokeGatewayTool<CronListResult>("cron", {
            action: "list",
            includeDisabled: true,
        })
        return NextResponse.json(data.jobs ?? [])
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch cron jobs"
        console.error("[API /cron GET]:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

interface CronActionBody {
    action: "add" | "run" | "remove" | "update" | "status" | "runs"
    [key: string]: unknown
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    let body: CronActionBody

    try {
        body = (await req.json()) as CronActionBody
    } catch {
        return NextResponse.json(
            { ok: false, error: "Invalid JSON body" },
            { status: 400 },
        )
    }

    const validActions = ["add", "run", "remove", "update", "status", "runs"]
    if (!validActions.includes(body.action)) {
        return NextResponse.json(
            { ok: false, error: `Unknown action: ${body.action}` },
            { status: 400 },
        )
    }

    try {
        const result = await invokeGatewayTool("cron", body)
        return NextResponse.json({ ok: true, result })
    } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to ${body.action} cron`
        console.error(`[API /cron POST ${body.action}]:`, message)
        return NextResponse.json({ ok: false, error: message }, { status: 500 })
    }
}
