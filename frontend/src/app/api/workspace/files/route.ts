/**
 * Workspace files API route — reads report/feedback files from agent workspaces.
 *
 * Query params:
 * - type: "report" | "feedback" (required)
 * - file: specific file path to read content (optional)
 *
 * Without `file` → returns list of available files
 * With `file` → returns the file content
 *
 * @returns WorkspaceFile[] | { content: string }
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { scanWorkspaceFiles, readWorkspaceFile } from "@/lib/workspace-scanner"

export async function GET(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = req.nextUrl

    const type = searchParams.get("type")
    if (!type || !["report", "feedback"].includes(type)) {
        return NextResponse.json(
            { error: "type must be 'report' or 'feedback'" },
            { status: 400 },
        )
    }

    const file = searchParams.get("file")

    try {
        if (file) {
            /* Read specific file content */
            try {
                const content = await readWorkspaceFile(file)
                return NextResponse.json({ content })
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to read file"
                
                // Return appropriate status codes based on error type
                if (message.includes("Invalid file path")) {
                    return NextResponse.json(
                        { error: "Invalid file path" },
                        { status: 400 }
                    )
                } else if (message.includes("File not found")) {
                    return NextResponse.json(
                        { error: "File not found" },
                        { status: 404 }
                    )
                } else {
                    console.error("Error reading workspace file:", err)
                    return NextResponse.json(
                        { error: "Failed to read file" },
                        { status: 500 }
                    )
                }
            }
        }

        /* List files in the report/feedback directory */
        const files = await scanWorkspaceFiles(type as 'report' | 'feedback')
        return NextResponse.json(files)
    } catch (err) {
        console.error("Error scanning workspace files:", err)
        const message = err instanceof Error ? err.message : "Failed to read workspace files"
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
