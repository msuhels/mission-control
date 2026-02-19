/**
 * Manual test script for workspace-scanner path security validation
 * Run with: npx tsx src/lib/workspace-scanner.manual-test.ts
 */

import { isPathSafe } from './workspace-scanner';
import os from 'os';
import path from 'path';

const homeDir = os.homedir();
const openclawDir = path.join(homeDir, '.openclaw');

console.log('Testing isPathSafe function...\n');
console.log(`Home directory: ${homeDir}`);
console.log(`Openclaw directory: ${openclawDir}\n`);

// Test cases
const tests = [
  {
    name: 'Valid path within .openclaw',
    path: path.join(openclawDir, 'workspaces', 'agent1', 'report', 'file.md'),
    expected: true
  },
  {
    name: 'The .openclaw directory itself',
    path: openclawDir,
    expected: true
  },
  {
    name: 'Path with .. that escapes .openclaw',
    path: path.join(openclawDir, '..', 'etc', 'passwd'),
    expected: false
  },
  {
    name: 'Absolute path outside .openclaw',
    path: '/etc/passwd',
    expected: false
  },
  {
    name: 'Path in home but outside .openclaw',
    path: path.join(homeDir, 'Documents', 'file.txt'),
    expected: false
  },
  {
    name: 'Relative path resolving outside .openclaw',
    path: '../../../etc/passwd',
    expected: false
  },
  {
    name: 'Nested path within .openclaw',
    path: path.join(openclawDir, 'workspaces', 'agent1', 'report', 'subdir', 'file.md'),
    expected: true
  },
  {
    name: 'Legacy workspace-work path',
    path: path.join(openclawDir, 'workspace-work', 'report', 'file.md'),
    expected: true
  }
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  const result = isPathSafe(test.path);
  const status = result === test.expected ? '✓ PASS' : '✗ FAIL';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   Path: ${test.path}`);
  console.log(`   Expected: ${test.expected}, Got: ${result}`);
  console.log(`   ${status}\n`);
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

if (failed === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed!');
  process.exit(1);
}
