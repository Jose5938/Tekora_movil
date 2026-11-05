// Compile just the platform-independent HTTP/session core, then use Node's test runner.
const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync, readdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const build = mkdtempSync(join(tmpdir(), 'tekora-tests-'));
let status = 1;
try {
  const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tests/tsconfig.json', '--outDir', build], { stdio: 'inherit' });
  if (compiled.status === 0) {
    const files = readdirSync('tests').filter(name => name.endsWith('.test.cjs')).sort();
    if (files.length === 0) throw new Error('No test files found in tests/');
    status = 0;
    for (const file of files) {
      // node:test runs and reports tests when a file is executed directly.
      // Each file has its own process on Node 22 and 24, without version-specific flags.
      const tests = spawnSync(process.execPath, [join('tests', file)], {
        stdio: 'inherit', env: { ...process.env, TEKORA_TEST_BUILD: build },
      });
      if (tests.error) console.error(tests.error.message);
      if (tests.status !== 0) {
        status = tests.status ?? 1;
        break;
      }
    }
  }
} finally { rmSync(build, { recursive: true, force: true }); }
process.exitCode = status;
