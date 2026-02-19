/**
 * Avatar calculation utilities for agent cards.
 * Provides deterministic avatar assignment based on agent name.
 */

import type { Agent } from "@/lib/types/openclaw"

/**
 * Calculates the avatar path for an agent based on name.
 * Uses character code modulo 8 for deterministic assignment.
 * 
 * Algorithm:
 * 1. Use agent.name if present, otherwise fall back to agent.id
 * 2. Extract the first character and convert to uppercase
 * 3. Get the character code of the first character
 * 4. Calculate index: (charCode % 8) + 1 (results in 1-8)
 * 5. Return path: /avatars/{index}.png
 * 
 * Edge cases handled:
 * - Empty name: falls back to agent.id
 * - Undefined name: falls back to agent.id
 * - Special characters: uses their character code
 * - Numbers: uses their character code
 * 
 * @param agent - The agent object containing name and id
 * @returns Avatar path in format /avatars/[1-8].png
 * 
 * @example
 * getAvatarPath({ id: "1", name: "Alice" }) // "/avatars/2.png" (A=65, 65%8+1=2)
 * getAvatarPath({ id: "1", name: "Bob" }) // "/avatars/3.png" (B=66, 66%8+1=3)
 * getAvatarPath({ id: "agent-1", name: undefined }) // "/avatars/2.png" (a=97, 97%8+1=2)
 */
export function getAvatarPath(agent: Agent): string {
    // Use name if present, otherwise fall back to id
    const name = agent.name || agent.id
    
    // Get first character and convert to uppercase for consistency
    const firstChar = name.charAt(0).toUpperCase()
    
    // Get character code
    const charCode = firstChar.charCodeAt(0)
    
    // Calculate avatar index (1-8)
    const avatarIndex = (charCode % 8) + 1
    
    // Return avatar path
    return `/avatars/${avatarIndex}.png`
}
