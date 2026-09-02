import { access, readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const indexPath = path.join(distDir, 'index.html');
const allowedExtensions = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2', '.json']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(entryPath));
    else output.push(entryPath);
  }
  return output;
}

await access(indexPath);
const files = await walk(distDir);
const errors = [];
let totalBytes = 0;

for (const file of files) {
  const extension = path.extname(file).toLowerCase();
  const fileStat = await stat(file);
  totalBytes += fileStat.size;
  if (!allowedExtensions.has(extension)) errors.push(`Unsupported file type: ${path.relative(distDir, file)}`);
}

const html = await readFile(indexPath, 'utf8');
if (!/^<!DOCTYPE html>/i.test(html.trim())) errors.push('index.html must start with <!DOCTYPE html>');
if (!/lang="zh-CN"/.test(html)) errors.push('index.html must declare lang="zh-CN"');
if (!/viewport-fit=cover/.test(html)) errors.push('viewport must include viewport-fit=cover');
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) errors.push('Inline script is not allowed');
if (/\sonclick\s*=/i.test(html)) errors.push('Inline event handlers are not allowed');
if (/<base\b/i.test(html)) errors.push('<base> is not allowed');
if (/<(?:iframe|object)\b/i.test(html)) errors.push('iframe/object is not allowed');
if (/https?:\/\//i.test(html)) errors.push('External URL found in index.html');

const referencedAssets = Array.from(html.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g), (match) => match[1]);
const metaAssets = Array.from(
  html.matchAll(/<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]+content="(\.\/[^"?#]+)(?:[?#][^"]*)?"[^>]*>/g),
  (match) => match[1]
);
referencedAssets.push(...metaAssets);
for (const reference of referencedAssets) {
  const target = path.resolve(distDir, reference.slice(2));
  try {
    await access(target);
  } catch {
    errors.push(`Missing referenced asset: ${reference}`);
  }
}

const dataPath = path.join(distDir, 'assets', 'data.js');
const dataSource = await readFile(dataPath, 'utf8');
const weatherPhotos = Array.from(dataSource.matchAll(/photo:\s*['"](\.\/assets\/weather\/[^'"]+)['"]/g), (match) => match[1]);
if (weatherPhotos.length !== 16) errors.push(`Expected 16 local weather photos, received ${weatherPhotos.length}`);
for (const reference of weatherPhotos) {
  const target = path.resolve(distDir, reference.slice(2));
  try {
    await access(target);
  } catch {
    errors.push(`Missing weather photo: ${reference}`);
  }
}

const textFiles = files.filter((file) => ['.html', '.css', '.js'].includes(path.extname(file).toLowerCase()));
const forbiddenPatterns = [
  ['network request', /\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket\s*\(|new\s+EventSource\s*\(/],
  ['dynamic code execution', /\beval\s*\(|new\s+Function\s*\(|WebAssembly\./],
  ['blocked worker', /new\s+(?:Shared)?Worker\s*\(|serviceWorker\.register/],
  ['blocked clipboard', /navigator\.clipboard|execCommand\s*\(\s*['"]copy/],
  ['blocked navigation', /window\.open\s*\(|location\.(?:href\s*=|assign\s*\()/],
  ['external asset', /(?:src|href|url\()\s*[=:]?\s*['"]?https?:\/\//],
  ['local filesystem path', /\/Users\/|file:\/\//]
];

for (const file of textFiles) {
  const source = await readFile(file, 'utf8');
  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(source)) errors.push(`${label} found in ${path.relative(distDir, file)}`);
  }
  if (path.extname(file) === '.js') {
    const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (syntax.status !== 0) errors.push(`JavaScript syntax error in ${path.relative(distDir, file)}: ${syntax.stderr.trim()}`);
  }
}

if (totalBytes > 2 * 1024 * 1024) errors.push(`Package content is larger than recommended 2MB: ${totalBytes} bytes`);

if (errors.length) {
  process.stderr.write(errors.map((error) => `- ${error}`).join('\n') + '\n');
  process.exit(1);
}

process.stdout.write(`Validated ${files.length} files, ${(totalBytes / 1024).toFixed(1)}KB total.\n`);
