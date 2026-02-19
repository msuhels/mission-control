/**
 * Empty state placeholder shown when a page has no data.
 *
 * @param icon - Lucide icon component
 * @param title - Primary message
 * @param description - Supporting text
 */

import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description?: string
    children?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-medium">{title}</h3>
            {description && (
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    {description}
                </p>
            )}
            {children && <div className="mt-4">{children}</div>}
        </div>
    )
}
