/**
 * Cron jobs page — displays all scheduled cron jobs as cards.
 */

"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { CronGrid } from "./_components/cron-grid"
import type { CronJob } from "@/lib/types/openclaw"

export default function CronPage() {
    const [jobs, setJobs] = useState<CronJob[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchJobs = () => {
        setIsLoading(true)
        fetch("/api/cron")
            .then((res) => res.json())
            .then((data) => {
                setJobs(Array.isArray(data) ? data : data.jobs ?? [])
            })
            .catch(() => setJobs([]))
            .finally(() => setIsLoading(false))
    }

    useEffect(() => {
        fetchJobs()
    }, [])

    return (
        <>
            <PageHeader
                title="Cron Jobs"
                description="Scheduled automations managed by the gateway."
            />
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <CronGrid jobs={jobs} onJobCreated={fetchJobs} />
            )}
        </>
    )
}
