/**
 * Dashboard overview page — animated summary cards with quick stats.
 * Features gradient icons, staggered entrance animations, and hover effects.
 */

"use client"

import { Bot, Radio, CalendarClock, MessageCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { AnimatedCard, AnimatedContainer } from "@/components/animated-card"
import { GradientIcon } from "@/components/gradient-icon"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import type { GradientVariant } from "@/components/gradient-icon"

interface QuickLink {
    title: string
    href: string
    icon: LucideIcon
    description: string
    variant: GradientVariant
    stat?: string
}

const QUICK_LINKS: QuickLink[] = [
    {
        title: "Agents",
        href: "/dashboard/agents",
        icon: Bot,
        description: "Manage your AI agents",
        variant: "primary",
        stat: "Active",
    },
    {
        title: "Sessions",
        href: "/dashboard/sessions",
        icon: Radio,
        description: "View open sessions",
        variant: "success",
        stat: "Live",
    },
    {
        title: "Cron Jobs",
        href: "/dashboard/cron",
        icon: CalendarClock,
        description: "Scheduled automations",
        variant: "warning",
        stat: "Scheduled",
    },
    {
        title: "Chat",
        href: "/dashboard/chat",
        icon: MessageCircle,
        description: "Talk to your agent",
        variant: "info",
        stat: "Ready",
    },
]

export default function DashboardPage() {
    return (
        <>
            <PageHeader
                title="Dashboard"
                description="OpenClaw Mission Control — monitor and manage your agents."
            />

            <AnimatedContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {QUICK_LINKS.map((link, index) => (
                    <Link key={link.href} href={link.href}>
                        <AnimatedCard index={index}>
                            <div className="p-5">
                                {/* Header row */}
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {link.title}
                                        </p>
                                        <p className="text-lg font-semibold tracking-tight">
                                            {link.stat}
                                        </p>
                                    </div>
                                    <GradientIcon
                                        icon={link.icon}
                                        variant={link.variant}
                                        size="md"
                                        pulse
                                    />
                                </div>

                                {/* Description */}
                                <p className="mt-3 text-xs text-muted-foreground">
                                    {link.description}
                                </p>

                                {/* Bottom accent bar */}
                                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary transition-all duration-500 group-hover:w-full"
                                        style={{ width: "60%" }}
                                    />
                                </div>
                            </div>
                        </AnimatedCard>
                    </Link>
                ))}
            </AnimatedContainer>
        </>
    )
}
