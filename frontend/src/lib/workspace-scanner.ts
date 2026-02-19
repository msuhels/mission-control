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
 * Scans all workspace directories for report or feedback files.
 * Checks both the new multi-agent workspace structure (~/.openclaw/workspaces/)
 * and the legacy single workspace location (~/.openclaw/workspace-work/).
 * 
 * @param type - The type of files to scan for ('report' or 'feedback')
 * @returns Array of WorkspaceFile objects with metadata
 */
export async function scanWorkspaceFiles(type: 'report' | 'feedback'): Promise<WorkspaceFile[]> {
  const homeDir = os.homedir();
  const openclawDir = path.join(homeDir, '.openclaw');
  const results: WorkspaceFile[] = [];

  // Check if .openclaw directory exists
  try {
    await stat(openclawDir);
  } catch (error) {
    // Directory doesn't exist, return empty array
    console.warn(`OpenClaw directory not found: ${openclawDir}`);
    return [];
  }

  // Scan ~/.openclaw/workspaces/ for multi-agent workspaces
  const workspacesDir = path.join(openclawDir, 'workspaces');
  try {
    const workspaceDirs = await readdir(workspacesDir, { withFileTypes: true });
    
    for (const dirent of workspaceDirs) {
      if (dirent.isDirectory()) {
        const agentId = dirent.name;
        const workspaceDir = path.join(workspacesDir, agentId);
        const typeDir = path.join(workspaceDir, type);
        
        try {
          // Check if report/ or feedback/ subdirectory exists
          const typeDirStat = await stat(typeDir);
          if (typeDirStat.isDirectory()) {
            // List all .md files
            const files = await readdir(typeDir);
            const mdFiles = files.filter(file => file.endsWith('.md'));
            
            // Build WorkspaceFile objects
            for (const file of mdFiles) {
              const filePath = path.join(typeDir, file);
              results.push({
                name: file,
                path: filePath,
                date: extractDateFromFilename(file),
                agentId: agentId
              });
            }
          }
        } catch (error) {
          // Type directory doesn't exist or can't be read, skip this workspace
          console.warn(`Could not read ${type} directory for workspace ${agentId}:`, error);
        }
      }
    }
  } catch (error) {
    // Workspaces directory doesn't exist or can't be read
    console.warn(`Could not read workspaces directory: ${workspacesDir}`, error);
  }

  // Scan ~/.openclaw/workspace-work/ (legacy location)
  const legacyWorkspaceDir = path.join(openclawDir, 'workspace-work');
  try {
    const legacyTypeDirPath = path.join(legacyWorkspaceDir, type);
    const legacyTypeDirStat = await stat(legacyTypeDirPath);
    
    if (legacyTypeDirStat.isDirectory()) {
      // List all .md files
      const files = await readdir(legacyTypeDirPath);
      const mdFiles = files.filter(file => file.endsWith('.md'));
      
      // Build WorkspaceFile objects with "work" as agentId
      for (const file of mdFiles) {
        const filePath = path.join(legacyTypeDirPath, file);
        results.push({
          name: file,
          path: filePath,
          date: extractDateFromFilename(file),
          agentId: 'work'
        });
      }
    }
  } catch (error) {
    // Legacy workspace directory doesn't exist or can't be read
    console.warn(`Could not read legacy workspace directory: ${legacyWorkspaceDir}`, error);
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
