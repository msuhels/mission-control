/**
 * Health status indicator — green/red dot for sidebar.
 *
 * @param isHealthy - Whether the gateway is reachable
 * @param isLoading - Whether the first check is still pending
 */

"use client"

import { cn } from "@/lib/utils"

interface HealthIndicatorProps {
    isHealthy: boolean
    isLoading: boolean
}

export function HealthIndicator({ isHealthy, isLoading }: HealthIndicatorProps) {
    return (
        <div className="flex items-center gap-2">
            <span
                className={cn(
                    "relative flex h-2.5 w-2.5 rounded-full",
                    isLoading
                        ? "bg-muted-foreground/40"
                        : isHealthy
                            ? "bg-emerald-500"
                            : "bg-destructive",
                )}
            >
                {isHealthy && !isLoading && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
            </span>
            <span className="text-xs text-muted-foreground">
                {isLoading ? "Checking…" : isHealthy ? "Online" : "Offline"}
            </span>
        </div>
    )
}
