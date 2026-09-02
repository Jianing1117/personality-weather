import { access, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const outputDir = path.resolve(projectRoot, '../../../outputs/xiaohongshu-minitools');
const outputPath = path.join(outputDir, 'personality-weather-friend-test-v4.zip');

await access(path.join(distDir, 'index.html'));
await mkdir(outputDir, { recursive: true });
await rm(outputPath, { force: true });

const archive = spawnSync('zip', ['-q', '-r', outputPath, '.'], {
  cwd: distDir,
  encoding: 'utf8'
});

if (archive.status !== 0) {
  process.stderr.write(archive.stderr || archive.stdout || 'Unable to create ZIP archive.\n');
  process.exit(archive.status || 1);
}

const archiveTest = spawnSync('unzip', ['-t', outputPath], { encoding: 'utf8' });
if (archiveTest.status !== 0) {
  process.stderr.write(archiveTest.stderr || archiveTest.stdout || 'ZIP integrity check failed.\n');
  process.exit(archiveTest.status || 1);
}

const archiveList = spawnSync('unzip', ['-Z1', outputPath], { encoding: 'utf8' });
const entries = (archiveList.stdout || '').trim().split(/\r?\n/).filter(Boolean);
if (!entries.includes('index.html') || entries.some((entry) => entry.startsWith('dist/'))) {
  process.stderr.write('ZIP must contain index.html at root and must not wrap files in dist/.\n');
  process.exit(1);
}

process.stdout.write(`Packaged friend-test ZIP at ${outputPath}\n`);
