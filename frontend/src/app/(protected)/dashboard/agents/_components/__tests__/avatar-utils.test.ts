/**
 * Unit tests for avatar calculation utilities
 */

import { describe, it, expect } from 'vitest'
import { getAvatarPath } from '../avatar-utils'
import type { Agent } from '@/lib/types/openclaw'

describe('getAvatarPath', () => {
    it('should calculate avatar path for agent with name', () => {
        const agent: Agent = {
            id: '1',
            name: 'Alice',
            configured: true
        }
        
        // A = 65, 65 % 8 + 1 = 2
        expect(getAvatarPath(agent)).toBe('/avatars/2.png')
    })

    it('should calculate avatar path for different names', () => {
        const bob: Agent = { id: '2', name: 'Bob', configured: true }
        const charlie: Agent = { id: '3', name: 'Charlie', configured: true }
        
        // B = 66, 66 % 8 + 1 = 3
        expect(getAvatarPath(bob)).toBe('/avatars/3.png')
        
        // C = 67, 67 % 8 + 1 = 4
        expect(getAvatarPath(charlie)).toBe('/avatars/4.png')
    })

    it('should use agent id when name is undefined', () => {
        const agent: Agent = {
            id: 'agent-1',
            configured: true
        }
        
        // a = 97, 97 % 8 + 1 = 2
        expect(getAvatarPath(agent)).toBe('/avatars/2.png')
    })

    it('should use agent id when name is empty string', () => {
        const agent: Agent = {
            id: 'test-agent',
            name: '',
            configured: true
        }
        
        // t = 116, 116 % 8 + 1 = 5
        expect(getAvatarPath(agent)).toBe('/avatars/5.png')
    })

    it('should handle single character names', () => {
        const agent: Agent = {
            id: '1',
            name: 'X',
            configured: true
        }
        
        // X = 88, 88 % 8 + 1 = 1
        expect(getAvatarPath(agent)).toBe('/avatars/1.png')
    })

    it('should handle names starting with numbers', () => {
        const agent: Agent = {
            id: '1',
            name: '123-agent',
            configured: true
        }
        
        // '1' = 49, 49 % 8 + 1 = 2
        expect(getAvatarPath(agent)).toBe('/avatars/2.png')
    })

    it('should handle names starting with special characters', () => {
        const agent: Agent = {
            id: '1',
            name: '@special',
            configured: true
        }
        
        // '@' = 64, 64 % 8 + 1 = 1
        expect(getAvatarPath(agent)).toBe('/avatars/1.png')
    })

    it('should return same avatar for agents with same first letter', () => {
        const alice: Agent = { id: '1', name: 'Alice', configured: true }
        const adam: Agent = { id: '2', name: 'Adam', configured: true }
        const anna: Agent = { id: '3', name: 'Anna', configured: true }
        
        const aliceAvatar = getAvatarPath(alice)
        const adamAvatar = getAvatarPath(adam)
        const annaAvatar = getAvatarPath(anna)
        
        expect(aliceAvatar).toBe(adamAvatar)
        expect(adamAvatar).toBe(annaAvatar)
        expect(aliceAvatar).toBe('/avatars/2.png')
    })

    it('should be case-insensitive (converts to uppercase)', () => {
        const lowercase: Agent = { id: '1', name: 'alice', configured: true }
        const uppercase: Agent = { id: '2', name: 'ALICE', configured: true }
        const mixed: Agent = { id: '3', name: 'Alice', configured: true }
        
        expect(getAvatarPath(lowercase)).toBe(getAvatarPath(uppercase))
        expect(getAvatarPath(uppercase)).toBe(getAvatarPath(mixed))
    })

    it('should always return avatar index between 1 and 8', () => {
        // Test a variety of characters to ensure range
        const testNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                          'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
                          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                          '@', '#', '$', '%', '&', '*']
        
        testNames.forEach(name => {
            const agent: Agent = { id: '1', name, configured: true }
            const path = getAvatarPath(agent)
            const match = path.match(/\/avatars\/(\d+)\.png/)
            
            expect(match).not.toBeNull()
            if (match) {
                const index = parseInt(match[1], 10)
                expect(index).toBeGreaterThanOrEqual(1)
                expect(index).toBeLessThanOrEqual(8)
            }
        })
    })

    it('should be deterministic - same input always produces same output', () => {
        const agent: Agent = { id: '1', name: 'TestAgent', configured: true }
        
        const result1 = getAvatarPath(agent)
        const result2 = getAvatarPath(agent)
        const result3 = getAvatarPath(agent)
        
        expect(result1).toBe(result2)
        expect(result2).toBe(result3)
    })
})
