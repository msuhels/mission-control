/**
 * Task Steps API proxy.
 * GET /api/tasks/:id/steps  → list steps for a task
 */

import { NextRequest, NextResponse } from "next/server"

const POSTGREST_URL = process.env.POSTGREST_URL ?? "http://localhost:3001"

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    try {
        const { id } = await params
        const res = await fetch(
            `${POSTGREST_URL}/task_steps?task_id=eq.${id}&order=sort_order.asc`,
            {
                headers: { Accept: "application/json" },
                cache: "no-store",
            },
        )

        if (!res.ok) {
            const text = await res.text()
            return NextResponse.json(
                { error: `PostgREST error: ${text}` },
                { status: res.status },
            )
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 502 })
    }
}
