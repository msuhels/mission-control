/**
 * Single-task API proxy — proxies to PostgREST.
 *
 * PATCH  /api/tasks/:id   → update a task (status, priority, etc.)
 * DELETE /api/tasks/:id   → delete a task
 */

import { NextRequest, NextResponse } from "next/server"

const POSTGREST_URL = process.env.POSTGREST_URL ?? "http://localhost:3001"

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    try {
        const { id } = await params
        const body = await request.json()

        const res = await fetch(`${POSTGREST_URL}/tasks?id=eq.${id}`, {
            method: "PATCH",
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
        return NextResponse.json(data)
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 502 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    try {
        const { id } = await params

        const res = await fetch(`${POSTGREST_URL}/tasks?id=eq.${id}`, {
            method: "DELETE",
            headers: { Accept: "application/json" },
        })

        if (!res.ok) {
            const text = await res.text()
            return NextResponse.json(
                { error: `PostgREST error: ${text}` },
                { status: res.status },
            )
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 502 })
    }
}
