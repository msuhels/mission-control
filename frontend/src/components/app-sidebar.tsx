
"use client"

import * as React from "react"
import {
    Bot,
    CalendarClock,
    FileText,
    Home,
    Lightbulb,
    MessageCircle,
    Network,
    Radio,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarGroup,
    SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import { HealthIndicator } from "@/components/health-indicator"
import { useHealthCheck } from "@/hooks/useHealthCheck"

const NAV_ITEMS = [
    { title: "Overview", url: "/dashboard", icon: Home },
    { title: "Chat", url: "/dashboard/chat", icon: MessageCircle },
    { title: "Agents", url: "/dashboard/agents", icon: Bot },
    { title: "Tasks", url: "/dashboard/tasks", icon: CalendarClock },
    { title: "Cron Jobs", url: "/dashboard/cron", icon: CalendarClock },
    { title: "Reports", url: "/dashboard/reports", icon: FileText },
    { title: "Improvements", url: "/dashboard/improvements", icon: Lightbulb },
    { title: "Sessions", url: "/dashboard/sessions", icon: Radio },
    { title: "Connections", url: "/dashboard/agents/connections", icon: Network },
]

const USER_DATA = {
    name: "Admin",
    email: "admin@gmail.com",
    avatar: "/avatars/shadcn.jpg",
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { isHealthy, isLoading } = useHealthCheck()

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="/dashboard">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Bot className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Mission Control</span>
                                    <HealthIndicator isHealthy={isHealthy} isLoading={isLoading} />
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarMenu>
                        {NAV_ITEMS.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild tooltip={item.title}>
                                    <a href={item.url}>
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </a>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <NavUser user={USER_DATA} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
