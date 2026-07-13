import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { name, version } = require('../package.json');
const outDir = join(root, 'builds');
const outFile = join(outDir, `${name}-${version}.vsix`);
const vsceCli = require.resolve('@vscode/vsce/vsce');

mkdirSync(outDir, { recursive: true });

const result = spawnSync(
  process.execPath,
  [vsceCli, 'package', '--no-dependencies', '--out', outFile],
  {
    cwd: root,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
