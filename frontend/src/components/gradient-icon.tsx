/**
 * Gradient icon container for dashboard cards.
 * Renders an icon inside a gradient circle with optional pulse animation.
 *
 * @param icon - Lucide icon component
 * @param variant - Color variant for gradient
 * @param size - Icon container size
 * @param pulse - Whether to show a pulse ring animation
 */

"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export type GradientVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "purple"

interface GradientIconProps {
    icon: LucideIcon
    variant?: GradientVariant
    size?: "sm" | "md" | "lg"
    pulse?: boolean
    className?: string
}

const GRADIENT_MAP: Record<GradientVariant, { bg: string; icon: string; ring: string }> = {
    primary: {
        bg: "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5",
        icon: "text-primary",
        ring: "ring-primary/20",
    },
    secondary: {
        bg: "bg-gradient-to-br from-secondary/20 via-secondary/10 to-secondary/5",
        icon: "text-secondary",
        ring: "ring-secondary/20",
    },
    success: {
        bg: "bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-500/5",
        icon: "text-emerald-500 dark:text-emerald-400",
        ring: "ring-emerald-500/20",
    },
    warning: {
        bg: "bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-500/5",
        icon: "text-amber-500 dark:text-amber-400",
        ring: "ring-amber-500/20",
    },
    danger: {
        bg: "bg-gradient-to-br from-red-500/20 via-red-500/10 to-red-500/5",
        icon: "text-red-500 dark:text-red-400",
        ring: "ring-red-500/20",
    },
    info: {
        bg: "bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-blue-500/5",
        icon: "text-blue-500 dark:text-blue-400",
        ring: "ring-blue-500/20",
    },
    purple: {
        bg: "bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-purple-500/5",
        icon: "text-purple-500 dark:text-purple-400",
        ring: "ring-purple-500/20",
    },
}

const SIZE_MAP = {
    sm: { container: "h-8 w-8", icon: "h-4 w-4" },
    md: { container: "h-10 w-10", icon: "h-5 w-5" },
    lg: { container: "h-12 w-12", icon: "h-6 w-6" },
}

export function GradientIcon({
    icon: Icon,
    variant = "primary",
    size = "md",
    pulse = false,
    className,
}: GradientIconProps) {
    const gradient = GRADIENT_MAP[variant]
    const sizeConfig = SIZE_MAP[size]

    return (
        <div className={cn("relative", className)}>
            {pulse && (
                <motion.div
                    className={cn(
                        "absolute inset-0 rounded-xl ring-2",
                        gradient.ring
                    )}
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            )}
            <motion.div
                className={cn(
                    "flex items-center justify-center rounded-xl",
                    gradient.bg,
                    sizeConfig.container
                )}
                whileHover={{
                    rotate: [0, -5, 5, 0],
                    transition: { duration: 0.4 },
                }}
            >
                <Icon className={cn(sizeConfig.icon, gradient.icon)} />
            </motion.div>
        </div>
    )
}
