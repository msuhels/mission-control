/**
 * Skills health check & installer API route.
 *
 * GET  — For each agent, reports whether its workspace contains the
 *        Mission Control SKILL.md files **and** whether its AGENTS.md
 *        references each skill.
 *
 * POST — Installs the skills for one or more agents.
 *        Body: { agentIds: string[] }
 *        - Copies each SKILL.md into <workspace>/skills/<skill-dir>/
 *        - Appends reference sections to AGENTS.md (or creates it)
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

interface SkillDetail {
    key: string
    label: string
    hasSkillFile: boolean
    hasAgentMdRef: boolean
    installed: boolean
}

interface SkillStatus {
    agentId: string
    agentName: string
    workspace: string | null
    skills: SkillDetail[]
    allInstalled: boolean
    // Legacy compat — true if ALL skills are installed
    hasSkillFile: boolean
    hasAgentMdRef: boolean
    installed: boolean
}

/* ------------------------------------------------------------------ */
/*  Skill definitions                                                  */
/* ------------------------------------------------------------------ */

interface SkillDef {
    key: string
    dirName: string
    refMarker: string
    label: string
    refBlock: string
}

const SKILLS: SkillDef[] = [
    {
        key: "tasks",
        dirName: "mission-control-tasks",
        refMarker: "mission-control-tasks",
        label: "Task Management",
        refBlock: [
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
        ].join("\n"),
    },
    {
        key: "reporting",
        dirName: "mission-control-reporting",
        refMarker: "mission-control-reporting",
        label: "Reporting",
        refBlock: [
            "",
            "## Mission Control — Reporting",
            "",
            "This agent has access to the **Mission Control Reporting** skill.",
            "Read `skills/mission-control-reporting/SKILL.md` for full details.",
            "",
            "Key capabilities:",
            "- Generate a completion report when all tasks under a requirement are `done`",
            "- Reports are written to `~/.openclaw/workspaces/<agent-id>/report/<DD-MM-YY>.md`",
            "- If a report file already exists for the day, append to it",
            "- Reports are **mandatory** after completing a requirement",
            "",
        ].join("\n"),
    },
    {
        key: "feedback",
        dirName: "mission-control-feedback",
        refMarker: "mission-control-feedback",
        label: "Feedback",
        refBlock: [
            "",
            "## Mission Control — Feedback",
            "",
            "This agent has access to the **Mission Control Feedback** skill.",
            "Read `skills/mission-control-feedback/SKILL.md` for full details.",
            "",
            "Key capabilities:",
            "- Self-evaluate after completing a requirement's tasks",
            "- Log inaccuracies, improvement areas, and lessons learned",
            "- Feedback is written to `~/.openclaw/workspaces/<agent-id>/feedback/<DD-MM-YY>.md`",
            "- Feedback is **optional** — only write if there is something meaningful to improve",
            "",
        ].join("\n"),
    },
]

const SKILL_FILE = "SKILL.md"
const AGENTS_MD = "AGENTS.md"

/* ------------------------------------------------------------------ */
/*  Canonical skill source lookup                                      */
/* ------------------------------------------------------------------ */

function findCanonicalSkillPath(dirName: string): string | null {
    const candidates = [
        // Docker: mounted via compose volume at /skills
        path.join("/skills", dirName, SKILL_FILE),
        // Local dev: project root is one level above frontend/
        path.join(process.cwd(), "..", "skills", dirName, SKILL_FILE),
        // Fallback: relative to cwd
        path.join(process.cwd(), "skills", dirName, SKILL_FILE),
        // Absolute path on host (if mounted same)
        path.join(
            "/home/ibr-ubuntu/abhishek_resources/projects/company_projects/mission-control/skills",
            dirName,
            SKILL_FILE,
        ),
    ]
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate
    }
    console.error(
        `[findCanonicalSkillPath] No candidate found for ${dirName}. Checked:`,
        candidates,
    )
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
            const relativeFromOpenClaw = ws.slice(
                markerIndex + openClawMarker.length,
            ) // "/workspaces/..."
            const mapped = path.join(
                os.homedir(),
                openClawMarker,
                relativeFromOpenClaw,
            )
            if (fs.existsSync(mapped)) {
                return mapped
            }
        }
    }

    return ws
}

function checkSkillsInstalled(workspace: string): {
    skills: SkillDetail[]
    allInstalled: boolean
} {
    const skills: SkillDetail[] = SKILLS.map((def) => {
        const skillPath = path.join(
            workspace,
            "skills",
            def.dirName,
            SKILL_FILE,
        )
        const hasSkillFile = fs.existsSync(skillPath)

        let hasAgentMdRef = false
        const agentsMdPath = path.join(workspace, AGENTS_MD)
        if (fs.existsSync(agentsMdPath)) {
            try {
                const content = fs.readFileSync(agentsMdPath, "utf-8")
                hasAgentMdRef = content.includes(def.refMarker)
            } catch {
                // ignore read errors
            }
        }

        return {
            key: def.key,
            label: def.label,
            hasSkillFile,
            hasAgentMdRef,
            installed: hasSkillFile && hasAgentMdRef,
        }
    })

    return {
        skills,
        allInstalled: skills.every((s) => s.installed),
    }
}

function installSkills(workspace: string): void {
    for (const def of SKILLS) {
        // 1. Copy SKILL.md
        const targetDir = path.join(workspace, "skills", def.dirName)
        fs.mkdirSync(targetDir, { recursive: true })

        const canonicalPath = findCanonicalSkillPath(def.dirName)
        const targetPath = path.join(targetDir, SKILL_FILE)
        if (canonicalPath) {
            fs.copyFileSync(canonicalPath, targetPath)
        } else {
            throw new Error(
                `Canonical SKILL.md not found for ${def.dirName}. Ensure skills/${def.dirName}/SKILL.md exists in the project root.`,
            )
        }

        // 2. Add reference to AGENTS.md (if not already present)
        const agentsMdPath = path.join(workspace, AGENTS_MD)
        if (fs.existsSync(agentsMdPath)) {
            const existing = fs.readFileSync(agentsMdPath, "utf-8")
            if (!existing.includes(def.refMarker)) {
                fs.appendFileSync(agentsMdPath, def.refBlock)
            }
        } else {
            // Create a minimal AGENTS.md with the first reference
            const header = `# AGENTS.md\n\nWorkspace configuration and skill references.\n`
            fs.writeFileSync(agentsMdPath, header + def.refBlock)
        }
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
                    const emptySkills: SkillDetail[] = SKILLS.map((def) => ({
                        key: def.key,
                        label: def.label,
                        hasSkillFile: false,
                        hasAgentMdRef: false,
                        installed: false,
                    }))
                    return {
                        agentId: entry.id,
                        agentName: entry.name || entry.id,
                        workspace,
                        skills: emptySkills,
                        allInstalled: false,
                        hasSkillFile: false,
                        hasAgentMdRef: false,
                        installed: false,
                    }
                }

                const { skills, allInstalled } =
                    checkSkillsInstalled(workspace)

                return {
                    agentId: entry.id,
                    agentName: entry.name || entry.id,
                    workspace,
                    skills,
                    allInstalled,
                    // Legacy compat: true only if ALL skills are installed
                    hasSkillFile: skills.every((s) => s.hasSkillFile),
                    hasAgentMdRef: skills.every((s) => s.hasAgentMdRef),
                    installed: allInstalled,
                }
            })

        // Check that all canonical skill sources exist
        const canonicalSkillsExist = SKILLS.every(
            (def) => findCanonicalSkillPath(def.dirName) !== null,
        )

        return NextResponse.json({
            agents: statuses,
            allInstalled: statuses.every((s) => s.allInstalled),
            canonicalSkillExists: canonicalSkillsExist,
        })
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to scan skills"
        console.error("[API /agents/skills GET]:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/* ------------------------------------------------------------------ */
/*  POST — install skills for specified agents                         */
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

        // Check all canonical sources exist
        const missingCanonical = SKILLS.filter(
            (def) => !findCanonicalSkillPath(def.dirName),
        )
        if (missingCanonical.length > 0) {
            return NextResponse.json(
                {
                    error: `Canonical SKILL.md not found for: ${missingCanonical.map((s) => s.dirName).join(", ")}. Ensure all skill files exist in the project root.`,
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
                installSkills(workspace)
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
