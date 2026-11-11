import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const name of await readdir(resolve(root, 'js'))) {
  if (!/\.m?js$/.test(name)) continue;
  const file = resolve(root, 'js', name), source = await readFile(file, 'utf8');
  const checked = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: source, encoding: 'utf8' });
  if (checked.status !== 0) throw Error(`${name}: ${checked.stderr}`);
  for (const match of source.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g)) {
    await access(resolve(dirname(file), match[1].split('?')[0]));
  }
  // Catch renamed/deleted controls before shipping a broken game or share dialog.
  for (const match of source.matchAll(/(?:getElementById\(['"]|\$\(['"]#)([\w-]+)['"]/g)) {
    if (!ids.has(match[1])) throw Error(`${name}: missing HTML control #${match[1]}`);
  }
}
for (const match of html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)(?:\?[^\"]*)?"/g)) {
  await access(resolve(root, match[1]));
}
for (const name of ['menu', 'quiz', 'road']) {
  const bytes = await readFile(resolve(root, 'audio', `${name}.mp3`));
  if (bytes.length < 1000) throw Error(`Missing or empty audio: ${name}`);
}
console.log('Game syntax, imports, controls and required assets passed.');
