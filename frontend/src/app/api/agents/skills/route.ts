/**
 * Skills health check & installer API route.
 *
 * GET  — For each agent, reports whether its workspace contains the
 *        Mission Control SKILL.md **and** whether its AGENTS.md references
 *        the skill.
 *
 * POST — Installs the skill for one or more agents.
 *        Body: { agentIds: string[] }
 *        - Copies SKILL.md into <workspace>/skills/mission-control-tasks/
 *        - Appends a reference section to AGENTS.md (or creates it)
 */

import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { NextRequest, NextResponse } from "next/server"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConfigAgentEntry {
    id: string
    name?: string
    workspace?: string
}

interface OpenClawConfig {
    agents?: {
        defaults?: { workspace?: string }
        list?: ConfigAgentEntry[]
    }
}

interface SkillStatus {
    agentId: string
    agentName: string
    workspace: string | null
    hasSkillFile: boolean
    hasAgentMdRef: boolean
    installed: boolean
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SKILL_DIR_NAME = "skills/mission-control-tasks"
const SKILL_FILE = "SKILL.md"
const AGENTS_MD = "AGENTS.md"
const SKILL_REF_MARKER = "mission-control-tasks"

// Canonical source SKILL.md — search in multiple locations
// (project root for local dev, Docker mount, relative to cwd)
function findCanonicalSkillPath(): string | null {
    const candidates = [
        // Docker: mounted via compose volume at /skills
        path.join("/skills", "mission-control-tasks", SKILL_FILE),
        // Local dev: project root is one level above frontend/
        path.join(process.cwd(), "..", "skills", "mission-control-tasks", SKILL_FILE),
        // Fallback: relative to cwd
        path.join(process.cwd(), "skills", "mission-control-tasks", SKILL_FILE),
        // Absolute path on host (if mounted same)
        path.join("/home/ibr-ubuntu/abhishek_resources/projects/company_projects/mission-control/skills", "mission-control-tasks", SKILL_FILE),
    ]
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate
    }
    console.error("[findCanonicalSkillPath] No candidate found. Checked:", candidates)
    return null
}


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function readConfig(): OpenClawConfig {
    const configPath = path.join(os.homedir(), ".openclaw", "openclaw.json")
    const raw = fs.readFileSync(configPath, "utf-8")
    return JSON.parse(raw)
}

function resolveWorkspace(
    entry: ConfigAgentEntry,
    defaults?: OpenClawConfig["agents"],
): string | null {
    let ws = entry.workspace ?? defaults?.defaults?.workspace ?? null
    if (!ws) return null

    // Expand ~ to homedir
    if (ws.startsWith("~/")) {
        ws = path.join(os.homedir(), ws.slice(2))
    }

    // Docker path remapping:
    // If we're inside the container, workspaces might be absolute paths from the host
    // (e.g. /home/ibr-ubuntu/.openclaw/workspaces/...) but mounted at /root/.openclaw/...
    if (!fs.existsSync(ws)) {
        const openClawMarker = ".openclaw"
        const markerIndex = ws.indexOf(openClawMarker)
        if (markerIndex !== -1) {
            // Reconstruct path inside container: os.homedir() is /root
            const relativeFromOpenClaw = ws.slice(markerIndex + openClawMarker.length) // "/workspaces/..."
            const mapped = path.join(os.homedir(), openClawMarker, relativeFromOpenClaw)
            if (fs.existsSync(mapped)) {
                return mapped
            }
        }
    }

    return ws
}

function checkSkillInstalled(workspace: string): {
    hasSkillFile: boolean
    hasAgentMdRef: boolean
} {
    const skillPath = path.join(workspace, SKILL_DIR_NAME, SKILL_FILE)
    const hasSkillFile = fs.existsSync(skillPath)

    let hasAgentMdRef = false
    const agentsMdPath = path.join(workspace, AGENTS_MD)
    if (fs.existsSync(agentsMdPath)) {
        try {
            const content = fs.readFileSync(agentsMdPath, "utf-8")
            hasAgentMdRef = content.includes(SKILL_REF_MARKER)
        } catch {
            // ignore read errors
        }
    }

    return { hasSkillFile, hasAgentMdRef }
}

function installSkill(workspace: string): void {
    // 1. Copy SKILL.md
    const targetDir = path.join(workspace, SKILL_DIR_NAME)
    fs.mkdirSync(targetDir, { recursive: true })

    const canonicalPath = findCanonicalSkillPath()
    const targetPath = path.join(targetDir, SKILL_FILE)
    if (canonicalPath) {
        fs.copyFileSync(canonicalPath, targetPath)
    } else {
        throw new Error(
            "Canonical SKILL.md not found. Ensure skills/mission-control-tasks/SKILL.md exists in the project root.",
        )
    }

    // 2. Add reference to AGENTS.md
    const agentsMdPath = path.join(workspace, AGENTS_MD)
    const refBlock = [
        "",
        "## Mission Control — Task Management",
        "",
        "This agent has access to the **Mission Control Task Management** skill.",
        "Read `skills/mission-control-tasks/SKILL.md` for full details on how to",
        "create, update, and track tasks via the PostgREST API.",
        "",
        "Key capabilities:",
        "- Create and manage tasks at `http://localhost:3001/tasks`",
        "- Log progress via `task_steps`",
        "- Request human reviews via `task_reviews`",
        "- Use your own judgement about when to decompose requirements into tasks",
        "",
    ].join("\n")

    if (fs.existsSync(agentsMdPath)) {
        const existing = fs.readFileSync(agentsMdPath, "utf-8")
        if (!existing.includes(SKILL_REF_MARKER)) {
            fs.appendFileSync(agentsMdPath, refBlock)
        }
    } else {
        // Create a minimal AGENTS.md with the reference
        const header = `# AGENTS.md\n\nWorkspace configuration and skill references.\n`
        fs.writeFileSync(agentsMdPath, header + refBlock)
    }
}

/* ------------------------------------------------------------------ */
/*  GET — scan all agents for skill status                             */
/* ------------------------------------------------------------------ */

export async function GET(): Promise<NextResponse> {
    try {
        const config = readConfig()
        const list = config.agents?.list ?? []

        const statuses: SkillStatus[] = list
            .filter((e): e is ConfigAgentEntry => Boolean(e?.id))
            .map((entry) => {
                const workspace = resolveWorkspace(entry, config.agents)
                if (!workspace || !fs.existsSync(workspace)) {
                    return {
                        agentId: entry.id,
                        agentName: entry.name || entry.id,
                        workspace,
                        hasSkillFile: false,
                        hasAgentMdRef: false,
                        installed: false,
                    }
                }

                const { hasSkillFile, hasAgentMdRef } =
                    checkSkillInstalled(workspace)

                return {
                    agentId: entry.id,
                    agentName: entry.name || entry.id,
                    workspace,
                    hasSkillFile,
                    hasAgentMdRef,
                    installed: hasSkillFile && hasAgentMdRef,
                }
            })

        return NextResponse.json({
            agents: statuses,
            allInstalled: statuses.every((s) => s.installed),
            canonicalSkillExists: findCanonicalSkillPath() !== null,
        })
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to scan skills"
        console.error("[API /agents/skills GET]:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/* ------------------------------------------------------------------ */
/*  POST — install skill for specified agents                          */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json()
        const { agentIds } = body as { agentIds?: string[] }

        if (!agentIds?.length) {
            return NextResponse.json(
                { error: "agentIds array is required" },
                { status: 400 },
            )
        }

        if (!findCanonicalSkillPath()) {
            return NextResponse.json(
                {
                    error: "Canonical SKILL.md not found. Ensure skills/mission-control-tasks/SKILL.md exists in the project root.",
                },
                { status: 500 },
            )
        }

        const config = readConfig()
        const list = config.agents?.list ?? []
        const results: Array<{
            agentId: string
            success: boolean
            error?: string
        }> = []

        for (const agentId of agentIds) {
            const entry = list.find(
                (e) => e.id.toLowerCase() === agentId.toLowerCase(),
            )
            if (!entry) {
                results.push({
                    agentId,
                    success: false,
                    error: "Agent not found",
                })
                continue
            }

            const workspace = resolveWorkspace(entry, config.agents)
            if (!workspace) {
                results.push({
                    agentId,
                    success: false,
                    error: "No workspace configured",
                })
                continue
            }

            if (!fs.existsSync(workspace)) {
                results.push({
                    agentId,
                    success: false,
                    error: `Workspace not found: ${workspace}`,
                })
                continue
            }

            try {
                installSkill(workspace)
                results.push({ agentId, success: true })
            } catch (installErr) {
                results.push({
                    agentId,
                    success: false,
                    error:
                        installErr instanceof Error
                            ? installErr.message
                            : "Install failed",
                })
            }
        }

        return NextResponse.json({
            ok: true,
            results,
            allSucceeded: results.every((r) => r.success),
        })
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to install skills"
        console.error("[API /agents/skills POST]:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
