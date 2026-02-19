/**
 * SkillHealthToast — client component that fires a sonner warning toast
 * once per session when agents are missing the Mission Control skill.
 *
 * Meant to be dropped into a server-rendered layout so the toast appears
 * on every protected page without duplicating hook calls.
 */

"use client"

import { useSkillHealth } from "@/hooks/useSkillHealth"

export function SkillHealthToast() {
    useSkillHealth()
    return null
}
