import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Represents a workspace file (report or feedback) with metadata
 */
export interface WorkspaceFile {
  name: string;
  path: string;
  date: string;
  agentId: string;
}

/**
 * Validates that a file path is safe and within the allowed openclaw directory.
 * Prevents path traversal attacks and ensures all file access is restricted to ~/.openclaw/
 * 
 * @param filePath - The file path to validate
 * @returns true if the path is safe, false otherwise
 */
export function isPathSafe(filePath: string): boolean {
  // Resolve the home directory
  const homeDir = os.homedir();
  const openclawDir = path.join(homeDir, '.openclaw');

  // Resolve the full path (this will resolve .. and . components)
  const resolvedPath = path.resolve(filePath);

  // Check if the resolved path starts with the openclaw directory
  // This ensures the path is within ~/.openclaw/ and prevents path traversal
  return resolvedPath.startsWith(openclawDir + path.sep) || resolvedPath === openclawDir;
}

/**
 * Extracts date from filename using the pattern DD-MM-YY or DD-MM-YYYY.
 * Falls back to returning the filename if no date pattern is found.
 * 
 * @param filename - The filename to extract date from (e.g., "18-02-26.md")
 * @returns The extracted date string (e.g., "18-02-26") or the original filename
 */
export function extractDateFromFilename(filename: string): string {
  // Pattern matches DD-MM-YY or DD-MM-YYYY format
  const datePattern = /(\d{2}-\d{2}-\d{2,4})/;
  const match = filename.match(datePattern);

  // Return the matched date or fallback to the filename
  return match ? match[1] : filename;
}

/**
 * Helper to get all agent workspaces from openclaw.json
 */
async function getAgentWorkspaces(): Promise<{ agentId: string; path: string }[]> {
  const homeDir = os.homedir();
  const openclawDir = path.join(homeDir, '.openclaw');
  const configPath = path.join(openclawDir, 'openclaw.json');

  try {
    const configData = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    const results: { agentId: string; path: string }[] = [];

    if (!config.agents) return [];

    const defaultWorkspace = config.agents.defaults?.workspace;
    const agentList = config.agents.list || [];

    for (const agent of agentList) {
      if (!agent.id) continue;

      let workspacePath = agent.workspace || defaultWorkspace;
      if (!workspacePath) continue;

      // Docker path translation:
      // If the path in the config looks like a host path (contains /.openclaw/), 
      // replace the prefix with the container's .openclaw path.
      if (workspacePath.includes('.openclaw')) {
        const parts = workspacePath.split(path.sep);
        const openclawIdx = parts.indexOf('.openclaw');
        if (openclawIdx !== -1) {
          // Reconstruct path relative to container's .openclaw
          workspacePath = path.join(openclawDir, ...parts.slice(openclawIdx + 1));
        }
      } else if (!path.isAbsolute(workspacePath)) {
        // If relative, assume it's relative to .openclaw or home
        workspacePath = path.resolve(homeDir, workspacePath);
      }

      results.push({
        agentId: agent.id,
        path: workspacePath
      });
    }

    return results;
  } catch (error) {
    console.warn(`Could not read openclaw.json:`, error);
    return [];
  }
}

/**
 * Scans all workspace directories for report or feedback files.
 * Reads workspace locations from openclaw.json.
 * 
 * @param type - The type of files to scan for ('report' or 'feedback')
 * @returns Array of WorkspaceFile objects with metadata
 */
export async function scanWorkspaceFiles(type: 'report' | 'feedback'): Promise<WorkspaceFile[]> {
  const results: WorkspaceFile[] = [];
  const workspaces = await getAgentWorkspaces();

  for (const workspace of workspaces) {
    const typeDir = path.join(workspace.path, type);

    try {
      const typeDirStat = await stat(typeDir);
      if (typeDirStat.isDirectory()) {
        const files = await readdir(typeDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        for (const file of mdFiles) {
          results.push({
            name: file,
            path: path.join(typeDir, file),
            date: extractDateFromFilename(file),
            agentId: workspace.agentId
          });
        }
      }
    } catch (error: any) {
      // Silently skip non-existent directories for agents
      if (error.code !== 'ENOENT') {
        console.warn(`Could not read ${type} directory for agent ${workspace.agentId}:`, error);
      }
    }
  }

  return results;
}

/**
 * Reads the content of a workspace file (report or feedback).
 * Validates that the file path is safe before reading.
 * 
 * @param filePath - The absolute path to the file to read
 * @returns The file content as a string
 * @throws Error if the path is unsafe or file cannot be read
 */
export async function readWorkspaceFile(filePath: string): Promise<string> {
  // Validate path is safe
  if (!isPathSafe(filePath)) {
    throw new Error('Invalid file path: path must be within ~/.openclaw/ directory');
  }

  try {
    // Read file content
    const content = await readFile(filePath, 'utf-8');
    return content;
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === 'ENOENT') {
      throw new Error('File not found');
    } else if (error.code === 'EACCES') {
      throw new Error('Permission denied');
    } else {
      // Re-throw other errors
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }
}
