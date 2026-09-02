import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'src');
const offlineOutputDir = path.join(projectRoot, 'dist');
const webOutputDir = path.join(projectRoot, 'dist-web');
const publicUrl = 'https://personality-weather-jianing.netlify.app/';
const publicImageUrl = publicUrl + 'assets/brand/personality-weather-og.jpg';

for (const outputDir of [offlineOutputDir, webOutputDir]) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await cp(sourceDir, outputDir, { recursive: true });
}

const webIndexPath = path.join(webOutputDir, 'index.html');
const webIndex = (await readFile(webIndexPath, 'utf8'))
  .replace('<meta property="og:url" content="./" />', `<meta property="og:url" content="${publicUrl}" />`)
  .replace('<meta property="og:image" content="./assets/brand/personality-weather-og.jpg" />', `<meta property="og:image" content="${publicImageUrl}" />`)
  .replace('<meta name="twitter:image" content="./assets/brand/personality-weather-og.jpg" />', `<meta name="twitter:image" content="${publicImageUrl}" />`);
await writeFile(webIndexPath, webIndex, 'utf8');

process.stdout.write(`Built offline minitool at ${offlineOutputDir}\n`);
process.stdout.write(`Built public web site at ${webOutputDir}\n`);
