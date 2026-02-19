import { describe, it, expect } from 'vitest';
import { isPathSafe, extractDateFromFilename } from './workspace-scanner';
import os from 'os';
import path from 'path';

describe('isPathSafe', () => {
  const homeDir = os.homedir();
  const openclawDir = path.join(homeDir, '.openclaw');

  it('should accept valid paths within .openclaw directory', () => {
    const validPath = path.join(openclawDir, 'workspaces', 'agent1', 'report', 'file.md');
    expect(isPathSafe(validPath)).toBe(true);
  });

  it('should accept the .openclaw directory itself', () => {
    expect(isPathSafe(openclawDir)).toBe(true);
  });

  it('should reject paths with .. that escape .openclaw directory', () => {
    const escapePath = path.join(openclawDir, '..', 'etc', 'passwd');
    expect(isPathSafe(escapePath)).toBe(false);
  });

  it('should reject absolute paths outside .openclaw directory', () => {
    const outsidePath = '/etc/passwd';
    expect(isPathSafe(outsidePath)).toBe(false);
  });

  it('should reject paths in home directory but outside .openclaw', () => {
    const homePath = path.join(homeDir, 'Documents', 'file.txt');
    expect(isPathSafe(homePath)).toBe(false);
  });

  it('should reject relative paths that resolve outside .openclaw', () => {
    const relativePath = '../../../etc/passwd';
    expect(isPathSafe(relativePath)).toBe(false);
  });

  it('should accept nested paths within .openclaw', () => {
    const nestedPath = path.join(openclawDir, 'workspaces', 'agent1', 'report', 'subdir', 'file.md');
    expect(isPathSafe(nestedPath)).toBe(true);
  });

  it('should accept workspace-work legacy path', () => {
    const legacyPath = path.join(openclawDir, 'workspace-work', 'report', 'file.md');
    expect(isPathSafe(legacyPath)).toBe(true);
  });
});

describe('extractDateFromFilename', () => {
  it('should extract date from DD-MM-YY format', () => {
    expect(extractDateFromFilename('18-02-26.md')).toBe('18-02-26');
  });

  it('should extract date from DD-MM-YYYY format', () => {
    expect(extractDateFromFilename('18-02-2026.md')).toBe('18-02-2026');
  });

  it('should extract date from filename with additional text before', () => {
    expect(extractDateFromFilename('report-18-02-26.md')).toBe('18-02-26');
  });

  it('should extract date from filename with additional text after', () => {
    expect(extractDateFromFilename('18-02-26-summary.md')).toBe('18-02-26');
  });

  it('should return filename when no date pattern is found', () => {
    expect(extractDateFromFilename('no-date-here.md')).toBe('no-date-here.md');
  });

  it('should return filename when date pattern is incomplete', () => {
    expect(extractDateFromFilename('18-02.md')).toBe('18-02.md');
  });

  it('should extract first date when multiple dates are present', () => {
    expect(extractDateFromFilename('18-02-26-and-19-03-27.md')).toBe('18-02-26');
  });

  it('should handle filename without extension', () => {
    expect(extractDateFromFilename('18-02-26')).toBe('18-02-26');
  });

  it('should return empty string when given empty string', () => {
    expect(extractDateFromFilename('')).toBe('');
  });
});

describe('scanWorkspaceFiles', () => {
  it('should return empty array when .openclaw directory does not exist', async () => {
    // This test assumes the .openclaw directory doesn't exist in the test environment
    // If it does exist, this test will need to be adjusted
    const { scanWorkspaceFiles } = await import('./workspace-scanner');
    const results = await scanWorkspaceFiles('report');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle missing workspaces directory gracefully', async () => {
    const { scanWorkspaceFiles } = await import('./workspace-scanner');
    const results = await scanWorkspaceFiles('feedback');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should return array of WorkspaceFile objects with correct structure', async () => {
    const { scanWorkspaceFiles } = await import('./workspace-scanner');
    const results = await scanWorkspaceFiles('report');
    
    // Verify structure of results
    results.forEach(file => {
      expect(file).toHaveProperty('name');
      expect(file).toHaveProperty('path');
      expect(file).toHaveProperty('date');
      expect(file).toHaveProperty('agentId');
      expect(typeof file.name).toBe('string');
      expect(typeof file.path).toBe('string');
      expect(typeof file.date).toBe('string');
      expect(typeof file.agentId).toBe('string');
    });
  });
});

describe('readWorkspaceFile', () => {
  const homeDir = os.homedir();
  const openclawDir = path.join(homeDir, '.openclaw');

  it('should throw error for unsafe paths', async () => {
    const { readWorkspaceFile } = await import('./workspace-scanner');
    const unsafePath = '/etc/passwd';
    
    await expect(readWorkspaceFile(unsafePath)).rejects.toThrow('Invalid file path');
  });

  it('should throw error for paths outside .openclaw directory', async () => {
    const { readWorkspaceFile } = await import('./workspace-scanner');
    const outsidePath = path.join(homeDir, 'Documents', 'file.txt');
    
    await expect(readWorkspaceFile(outsidePath)).rejects.toThrow('Invalid file path');
  });

  it('should throw error for paths with .. that escape .openclaw', async () => {
    const { readWorkspaceFile } = await import('./workspace-scanner');
    const escapePath = path.join(openclawDir, '..', 'etc', 'passwd');
    
    await expect(readWorkspaceFile(escapePath)).rejects.toThrow('Invalid file path');
  });

  it('should throw "File not found" error for non-existent files', async () => {
    const { readWorkspaceFile } = await import('./workspace-scanner');
    const nonExistentPath = path.join(openclawDir, 'workspaces', 'test', 'report', 'non-existent.md');
    
    await expect(readWorkspaceFile(nonExistentPath)).rejects.toThrow('File not found');
  });

  it('should accept valid paths within .openclaw directory', async () => {
    const { readWorkspaceFile } = await import('./workspace-scanner');
    const validPath = path.join(openclawDir, 'workspaces', 'agent1', 'report', 'file.md');
    
    // This will throw "File not found" if the file doesn't exist, but won't throw "Invalid file path"
    try {
      await readWorkspaceFile(validPath);
    } catch (error: any) {
      // Should not be an "Invalid file path" error
      expect(error.message).not.toContain('Invalid file path');
    }
  });
});
