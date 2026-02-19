/**
 * Agents API route — CRUD for agents via the openclaw CLI.
 *
 * GET    — list all configured agents from openclaw.json (read-only)
 * POST   — create a new agent  (`openclaw agents add ... --non-interactive`)
 * PUT    — update agent identity (`openclaw agents set-identity`)
 * DELETE — delete an agent      (`openclaw agents delete --force`)
 *
 * IMPORTANT: We NEVER write to openclaw.json directly.
 * All mutations go through the openclaw CLI which handles validation,
 * workspace setup, auth profiles, and binding management properly.
 *
 * After mutating operations we trigger `openclaw gateway restart`
 * because the gateway must reload config to pick up changes.
 */

import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { exec } from "node:child_process"
import { promisify } from "node:util"
import { NextRequest, NextResponse } from "next/server"

const execAsync = promisify(exec)

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConfigAgentEntry {
    id: string
    name?: string
    workspace?: string
    agentDir?: string
    model?: string | { primary?: string }
    default?: boolean
    identity?: {
        name?: string
        emoji?: string
        theme?: string
        avatar?: string
    }
}

interface OpenClawConfig {
    agents?: {
        defaults?: {
            model?: string | { primary?: string }
            workspace?: string
        }
        list?: ConfigAgentEntry[]
    }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveModel(
    agent: ConfigAgentEntry,
    defaults?: OpenClawConfig["agents"]
): string | undefined {
    const raw = agent.model ?? defaults?.defaults?.model
    if (!raw) return undefined
    if (typeof raw === "string") return raw
    return raw.primary ?? undefined
}

function readConfig(): OpenClawConfig {
    const configPath = path.join(os.homedir(), ".openclaw", "openclaw.json")
    const raw = fs.readFileSync(configPath, "utf-8")
    return JSON.parse(raw)
}

function buildAgentList(config: OpenClawConfig) {
    const list = config.agents?.list ?? []
    const defaults = config.agents

    return list
        .filter(
            (entry): entry is ConfigAgentEntry =>
                Boolean(entry && typeof entry === "object" && entry.id)
        )
        .map((entry, index) => ({
            id: entry.id,
            name: entry.identity?.name || entry.name,
            configured: true,
            workspace:
                entry.workspace ?? defaults?.defaults?.workspace ?? undefined,
            agentDir: entry.agentDir ?? undefined,
            model: resolveModel(entry, defaults),
            default: entry.default === true || index === 0,
            emoji: entry.identity?.emoji ?? undefined,
            theme: entry.identity?.theme ?? undefined,
            avatar: entry.identity?.avatar ?? undefined,
        }))
}

/**
 * Escape a shell argument to prevent injection.
 */
function shellEscape(arg: string): string {
    return `'${arg.replace(/'/g, "'\\''")}'`
}

/**
 * Run openclaw CLI in non-interactive mode.
 * All agent mutations MUST go through this — never edit openclaw.json directly.
 */
async function runCli(
    args: string,
    timeoutMs = 30_000
): Promise<{ stdout: string; stderr: string }> {
    return execAsync(`npx openclaw ${args}`, {
        timeout: timeoutMs,
        cwd: os.homedir(),
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
    })
}

/**
 * Restart the gateway so config changes take effect.
 * Failures here are non-fatal — we log them but still return success
 * to the client because the config change itself succeeded.
 */
async function restartGateway(): Promise<string | null> {
    try {
        const { stdout, stderr } = await runCli("gateway restart", 15_000)
        console.log("[gateway restart] stdout:", stdout.trim())
        if (stderr.trim()) console.warn("[gateway restart] stderr:", stderr.trim())
        return null
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error("[gateway restart] failed:", msg)
        return msg
    }
}

/* ------------------------------------------------------------------ */
/*  GET — list agents (read-only from config)                          */
/* ------------------------------------------------------------------ */

export async function GET(): Promise<NextResponse> {
    try {
        const config = readConfig()
        return NextResponse.json(buildAgentList(config))
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to fetch agents"
        console.error("[API /agents GET]:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/* ------------------------------------------------------------------ */
/*  POST — create agent via `openclaw agents add`                      */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json()
        const { name, workspace, model } = body as {
            name?: string
            workspace?: string
            model?: string
        }

        if (!name?.trim()) {
            return NextResponse.json(
                { error: "Agent name is required" },
                { status: 400 }
            )
        }
        if (!workspace?.trim()) {
            return NextResponse.json(
                { error: "Workspace directory is required" },
                { status: 400 }
            )
        }

        // Build the CLI command — all options passed via flags
        let cmd = `agents add ${shellEscape(name.trim())} --workspace ${shellEscape(workspace.trim())} --non-interactive --json`
        if (model?.trim()) {
            cmd += ` --model ${shellEscape(model.trim())}`
        }

        const { stdout, stderr } = await runCli(cmd)
        if (stderr.trim()) {
            console.warn("[API /agents POST] stderr:", stderr.trim())
        }

        // Restart gateway to pick up changes
        const restartError = await restartGateway()

        // Re-read config to return fresh list
        const config = readConfig()
        return NextResponse.json({
            ok: true,
            agents: buildAgentList(config),
            cliOutput: stdout.trim(),
            gatewayRestarted: !restartError,
            gatewayError: restartError,
        })
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to create agent"
        console.error("[API /agents POST]:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/* ------------------------------------------------------------------ */
/*  PUT — update agent identity via `openclaw agents set-identity`     */
/*                                                                     */
/*  NOTE: The openclaw CLI only supports editing identity (name, theme,*/
/*  emoji, avatar) via `set-identity`. Model and workspace changes     */
/*  are NOT supported in non-interactive CLI mode — users must use     */
/*  `openclaw agents add` interactively for those changes.             */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json()
        const { id, name, emoji, theme, avatar } = body as {
            id: string
            name?: string
            emoji?: string
            theme?: string
            avatar?: string
        }

        if (!id?.trim()) {
            return NextResponse.json(
                { error: "Agent id is required" },
                { status: 400 }
            )
        }

        // Verify agent exists before attempting update
        const config = readConfig()
        const list = config.agents?.list ?? []
        const exists = list.some(
            (e) => e.id.toLowerCase() === id.trim().toLowerCase()
        )
        if (!exists) {
            return NextResponse.json(
                { error: `Agent "${id}" not found` },
                { status: 404 }
            )
        }

        // Build the set-identity CLI command
        let cmd = `agents set-identity --agent ${shellEscape(id.trim())} --json`
        if (name?.trim()) cmd += ` --name ${shellEscape(name.trim())}`
        if (emoji?.trim()) cmd += ` --emoji ${shellEscape(emoji.trim())}`
        if (theme?.trim()) cmd += ` --theme ${shellEscape(theme.trim())}`
        if (avatar?.trim()) cmd += ` --avatar ${shellEscape(avatar.trim())}`

        // Check at least one identity field was provided
        if (!name?.trim() && !emoji?.trim() && !theme?.trim() && !avatar?.trim()) {
            return NextResponse.json(
                { error: "At least one identity field (name, emoji, theme, avatar) is required" },
                { status: 400 }
            )
        }

        const { stdout, stderr } = await runCli(cmd)
        if (stderr.trim()) {
            console.warn("[API /agents PUT] stderr:", stderr.trim())
        }

        const restartError = await restartGateway()
        const freshConfig = readConfig()

        return NextResponse.json({
            ok: true,
            agents: buildAgentList(freshConfig),
            cliOutput: stdout.trim(),
            gatewayRestarted: !restartError,
            gatewayError: restartError,
        })
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to update agent"
        console.error("[API /agents PUT]:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/* ------------------------------------------------------------------ */
/*  DELETE — delete agent via `openclaw agents delete`                 */
/* ------------------------------------------------------------------ */

export async function DELETE(req: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = req.nextUrl
        const id = searchParams.get("id")

        if (!id?.trim()) {
            return NextResponse.json(
                { error: "Agent id is required" },
                { status: 400 }
            )
        }

        if (id.trim().toLowerCase() === "main") {
            return NextResponse.json(
                { error: 'The default "main" agent cannot be deleted' },
                { status: 400 }
            )
        }

        const { stdout, stderr } = await runCli(
            `agents delete ${shellEscape(id.trim())} --force --json`
        )
        if (stderr.trim()) {
            console.warn("[API /agents DELETE] stderr:", stderr.trim())
        }

        const restartError = await restartGateway()
        const config = readConfig()

        return NextResponse.json({
            ok: true,
            agents: buildAgentList(config),
            cliOutput: stdout.trim(),
            gatewayRestarted: !restartError,
            gatewayError: restartError,
        })
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Failed to delete agent"
        console.error("[API /agents DELETE]:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
