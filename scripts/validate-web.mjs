import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(projectRoot, 'dist-web');
const indexPath = path.join(webDir, 'index.html');
const publicUrl = 'https://personality-weather-jianing.netlify.app/';
const publicImageUrl = publicUrl + 'assets/brand/personality-weather-og.jpg';

await access(indexPath);
await access(path.join(webDir, 'assets', 'brand', 'personality-weather-og.jpg'));

const html = await readFile(indexPath, 'utf8');
const errors = [];

if (!html.includes(`<meta property="og:url" content="${publicUrl}" />`)) {
  errors.push('Public build is missing the absolute og:url');
}
if (!html.includes(`<meta property="og:image" content="${publicImageUrl}" />`)) {
  errors.push('Public build is missing the absolute og:image');
}
if (!html.includes(`<meta name="twitter:image" content="${publicImageUrl}" />`)) {
  errors.push('Public build is missing the absolute twitter:image');
}
if (/content="\.\/assets\/brand\/personality-weather-og\.jpg"/.test(html)) {
  errors.push('Public build still contains a relative social preview image');
}

if (errors.length) {
  process.stderr.write(errors.map((error) => `- ${error}`).join('\n') + '\n');
  process.exit(1);
}

process.stdout.write('Validated public web metadata with absolute social preview URLs.\n');
