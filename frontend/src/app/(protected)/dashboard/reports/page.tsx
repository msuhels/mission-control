/**
 * Reports page — shows date-wise report files from agent workspaces.
 */

"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { FileCardGrid } from "@/components/file-card-grid"
import type { WorkspaceFile } from "@/lib/types/openclaw"

export default function ReportsPage() {
    const [files, setFiles] = useState<WorkspaceFile[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetch("/api/workspace/files?type=report")
            .then((res) => res.json())
            .then((data) => {
                setFiles(Array.isArray(data) ? data : [])
            })
            .catch(() => setFiles([]))
            .finally(() => setIsLoading(false))
    }, [])

    return (
        <>
            <PageHeader
                title="Reports"
                description="Date-wise reports from agent workspaces."
            />
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <FileCardGrid files={files} type="report" />
            )}
        </>
    )
}
