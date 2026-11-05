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
    const files = readdirSync('tests').filter(name => name.endsWith('.test.cjs')).map(name => join('tests', name));
    const tests = spawnSync(process.execPath, ['--test', '--test-isolation=none', ...files], {
      stdio: 'inherit', env: { ...process.env, TEKORA_TEST_BUILD: build },
    });
    status = tests.status ?? 1;
  }
} finally { rmSync(build, { recursive: true, force: true }); }
process.exitCode = status;
