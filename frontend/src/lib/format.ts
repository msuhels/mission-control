/**
 * Date / time formatting utilities for gateway data.
 *
 * Gateway timestamps are epoch **milliseconds** (not seconds).
 * Values > 1e12 are already in ms — never multiply by 1000.
 */

import { formatDistanceToNow, format } from "date-fns"
import type { CronSchedule } from "@/lib/types/openclaw"

/* ------------------------------------------------------------------ */
/*  Epoch helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Converts an epoch timestamp to a JS Date, handling ms vs s safely.
 *
 * @param epoch - Epoch value (ms if > 1e12, else treated as seconds)
 * @returns Date object
 */
export function epochToDate(epoch: number): Date {
    const ms = epoch > 1e12 ? epoch : epoch * 1000
    return new Date(ms)
}

/**
 * Formats an epoch timestamp as a localised date-time string.
 *
 * @param epoch - Epoch ms timestamp
 * @param pattern - date-fns format pattern (default: "MMM d, yyyy HH:mm")
 * @returns Formatted string
 */
export function formatEpochMs(epoch: number, pattern = "MMM d, yyyy HH:mm"): string {
    return format(epochToDate(epoch), pattern)
}

/**
 * Formats an epoch timestamp as a relative "time ago" string.
 *
 * @param epoch - Epoch ms timestamp
 * @returns e.g. "2 hours ago"
 */
export function formatRelativeTime(epoch: number): string {
    return formatDistanceToNow(epochToDate(epoch), { addSuffix: true })
}

/* ------------------------------------------------------------------ */
/*  Cron schedule helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * Extracts a human-readable schedule string from a `CronSchedule` object.
 *
 * The `schedule` field returned by the gateway is an **object**, not a string.
 * Use `schedule.expr` for cron expressions.
 *
 * @param schedule - CronSchedule object
 * @returns Human-readable schedule label
 */
export function parseCronSchedule(schedule: CronSchedule): string {
    if (!schedule) return "Unknown"

    switch (schedule.kind) {
        case "at":
            return schedule.at
                ? `One-shot: ${format(new Date(schedule.at), "MMM d, yyyy HH:mm")}`
                : "One-shot"

        case "every":
            return schedule.everyMs
                ? `Every ${formatDuration(schedule.everyMs)}`
                : "Interval"

        case "cron":
            return schedule.expr
                ? `${schedule.expr}${schedule.tz ? ` (${schedule.tz})` : ""}`
                : "Cron"

        default:
            return "Unknown schedule"
    }
}

/**
 * Converts milliseconds to a short human-readable duration.
 *
 * @param ms - Duration in milliseconds
 * @returns e.g. "1h 30m"
 */
export function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m`
    return `${seconds}s`
}
