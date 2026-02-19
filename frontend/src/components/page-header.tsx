/**
 * Reusable page header with title, description, and optional action slot.
 *
 * @param title - Page title
 * @param description - Optional subtitle / description
 * @param children - Optional action elements (buttons, etc.)
 */

interface PageHeaderProps {
    title: string
    description?: string
    children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-1 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
            {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
    )
}
