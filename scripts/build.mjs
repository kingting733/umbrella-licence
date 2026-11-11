import { readFile, writeFile, readdir, mkdir, rm, copyFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..'), out = resolve(root, 'dist');
const files = ['index.html'];
for (const dir of ['js', 'css', 'audio']) {
  for (const name of (await readdir(resolve(root, dir))).sort()) {
    if ((dir === 'audio' && name.endsWith('.mp3')) || (dir !== 'audio' && /\.(?:js|mjs|css)$/.test(name))) files.push(`${dir}/${name}`);
  }
}
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(await readFile(resolve(root, file)));
const assets = hash.digest('hex').slice(0, 16);
await rm(out, { recursive: true, force: true });
for (const file of files) {
  const dest = resolve(out, file);
  await mkdir(resolve(dest, '..'), { recursive: true });
  if (/\.(?:html|m?js|css)$/.test(file)) {
    const content = await readFile(resolve(root, file), 'utf8');
    await writeFile(dest, content.replace(/([?&]v=)[\w.-]+/g, `$1${assets}`));
  } else await copyFile(resolve(root, file), dest);
}
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
await writeFile(resolve(out, 'release.json'), JSON.stringify({ repository: 'kingting733/umbrella-licence', sourceCommit, assets }, null, 2) + '\n');
console.log(`Built ${relative(root, out)}: game ${sourceCommit}, assets ${assets}`);
