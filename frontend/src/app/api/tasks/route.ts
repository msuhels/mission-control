/**
 * Tasks API proxy — proxies to PostgREST.
 *
 * GET  /api/tasks        → list all tasks (ordered by priority desc, created_at desc)
 * POST /api/tasks        → create a new task
 */

import { NextRequest, NextResponse } from "next/server"

const POSTGREST_URL = process.env.POSTGREST_URL ?? "http://localhost:3001"

export async function GET(): Promise<NextResponse> {
    try {
        const res = await fetch(
            `${POSTGREST_URL}/tasks?order=priority.desc,created_at.desc`,
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

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json()

        const res = await fetch(`${POSTGREST_URL}/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Prefer: "return=representation",
            },
            body: JSON.stringify(body),
        })

        if (!res.ok) {
            const text = await res.text()
            return NextResponse.json(
                { error: `PostgREST error: ${text}` },
                { status: res.status },
            )
        }

        const data = await res.json()
        return NextResponse.json(data, { status: 201 })
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 502 })
    }
}
