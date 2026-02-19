/**
 * Animated card wrapper using Framer Motion.
 * Provides staggered entrance animations, hover lift, and glow effects.
 *
 * @param children - Card content
 * @param index - Position in list for stagger delay
 * @param className - Additional Tailwind classes
 * @param glowColor - Optional glow color on hover (HSL string)
 */

"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedCardProps {
    children: React.ReactNode
    index?: number
    className?: string
    glowColor?: string
    onClick?: () => void
}

const cardVariants = {
    hidden: {
        opacity: 0,
        y: 20,
        scale: 0.95,
    },
    visible: (index: number) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.4,
            delay: index * 0.08,
            ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
        },
    }),
}

export function AnimatedCard({
    children,
    index = 0,
    className,
    glowColor,
    onClick,
}: AnimatedCardProps) {
    return (
        <motion.div
            custom={index}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            whileHover={{
                y: -4,
                scale: 1.02,
                transition: { duration: 0.2, ease: "easeOut" },
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                "group relative cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-card p-0 shadow-sm",
                "transition-shadow duration-300",
                "hover:shadow-lg hover:shadow-primary/5",
                glowColor && "hover:border-primary/30",
                className
            )}
            style={{
                ...(glowColor
                    ? {
                        boxShadow: undefined,
                    }
                    : {}),
            }}
        >
            {/* Gradient border glow on hover */}
            <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20" />
                <div className="absolute inset-[1px] rounded-xl bg-card" />
            </div>

            {/* Shimmer effect */}
            <div className="pointer-events-none absolute inset-0 -translate-x-full opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100">
                <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </motion.div>
    )
}

/**
 * Container that orchestrates staggered children animations.
 *
 * @param children - Animated card children
 * @param className - Grid/layout classes
 */
interface AnimatedContainerProps {
    children: React.ReactNode
    className?: string
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
}

export function AnimatedContainer({ children, className }: AnimatedContainerProps) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className={className}
        >
            {children}
        </motion.div>
    )
}
