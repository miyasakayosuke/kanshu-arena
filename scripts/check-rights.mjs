import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = 'docs/rights/asset-manifest.json';
const noticeStart = '<!-- BEGIN THIRD-PARTY NOTICES -->';
const noticeEnd = '<!-- END THIRD-PARTY NOTICES -->';
const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const embeddedNotices = text => `${noticeStart}\n<pre id="software-notices">${escapeHtml(text)}</pre>\n${noticeEnd}`;
const mediaExtensions = /\.(?:svg|png|jpe?g|gif|webp|avif|ico|bmp|mp3|wav|ogg|m4a|mp4|webm|woff2?|ttf|otf|eot)$/i;
const read = (root, path) => readFileSync(join(root, path), 'utf8');
const json = (root, path) => JSON.parse(read(root, path));
const digest = text => createHash('sha256').update(text).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function files(root, dir) {
  if (!existsSync(join(root, dir))) return [];
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(root, path) : [path.split('\\').join('/')];
  });
}
function licenseText(root, component) {
  const source = read(root, component.licenseFile).replaceAll('\r\n', '\n');
  if (component.licenseSection === 'vite-core') {
    assert(source.includes('# Vite core license') && source.includes('# Licenses of bundled dependencies'), 'Vite license layout changed; review it before updating notices.');
    const core = source.split('# Licenses of bundled dependencies')[0];
    assert(core.includes('MIT License\n'), 'Missing Vite core MIT text.');
    return core.slice(core.indexOf('MIT License\n')).trim();
  }
  if (component.licenseSection === 'rollup-commonjs-helper') {
    const section = source.split('\n## ').find(value => value.startsWith('@rollup/plugin-alias, @rollup/plugin-commonjs,'));
    assert(section, 'Vite bundled Rollup license section changed; review it.');
    const text = section.split('\n').filter(line => line.startsWith('>')).map(line => line.replace(/^> ?/, '')).join('\n').trim();
    assert(text.includes('Copyright (c) 2019 RollupJS Plugin Contributors') && text.endsWith('THE SOFTWARE.'), 'Incomplete Rollup helper license.');
    return text;
  }
  assert(!component.licenseSection, `Unknown license selector for ${component.id}`);
  return source.trim();
}
export function expectedNotices(root, manifest = json(root, manifestPath)) {
  return 'THIRD-PARTY SOFTWARE NOTICES\n環獣のアリーナ\n\n' +
    'These notices apply to the third-party components listed below, including\nsmall build-generated helpers shipped to the browser. They do not license\nthe game\'s own code, artwork, story, name, or other original content.\n\n' +
    manifest.software.map(component => {
      const text = licenseText(root, component);
      assert(text?.includes('Permission is hereby granted') && text.includes('SOFTWARE.'), `Incomplete license for ${component.id}`);
      assert(digest(text) === component.licenseSha256, `License text changed for ${component.id}; review the upstream notice and manifest.`);
      return `${'='.repeat(72)}\n${component.displayName}\nSource: ${component.upstream}\nUse: ${component.distribution}\n\n${text}\n`;
    }).join('\n');
}
export function checkRights({ root = defaultRoot, dist = false } = {}) {
  const manifest = json(root, manifestPath);
  const lock = json(root, 'package-lock.json');
  assert(manifest.schemaVersion === 1, 'Unsupported rights manifest schema.');
  assert(manifest.status === 'ongoing-review-not-legal-clearance', 'Keep the review limits explicit.');
  const ids = new Set();
  for (const item of [...manifest.assets, ...manifest.software]) {
    assert(item.id && !ids.has(item.id), `Missing/duplicate manifest id: ${item.id}`);
    ids.add(item.id);
    assert(item.provenance && item.reviewLimit, `Missing provenance/review limit for ${item.id}`);
  }
  const coveredPackages = new Set();
  for (const component of manifest.software) {
    const locked = lock.packages[component.packagePath];
    assert(locked && locked.version === component.packageVersion, `Locked version changed for ${component.id}; review notices and inventory.`);
    const installed = json(root, `${component.packagePath}/package.json`);
    assert(installed.version === component.packageVersion, `Installed version differs from lockfile for ${component.id}; run npm ci.`);
    assert(locked.license === component.license, `License metadata changed for ${component.id}.`);
    coveredPackages.add(component.packagePath);
  }
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (path && !entry.dev && !entry.link) {
      assert(coveredPackages.has(path), `New production dependency needs a license review: ${path}`);
    }
  }
  const coveredFiles = new Set();
  for (const asset of manifest.assets) {
    for (const path of asset.files) {
      assert(existsSync(join(root, path)), `Manifest refers to a missing file: ${path}`);
      coveredFiles.add(path);
    }
    for (const [path, hash] of Object.entries(asset.sha256 ?? {})) {
      assert(digest(read(root, path)) === hash, `Artwork changed: ${path}. Review and update its provenance/hash; this check cannot judge similarity.`);
    }
  }
  const sourceFiles = files(root, 'src').filter(path => !/\.(test|spec)\./.test(path));
  for (const path of [...sourceFiles, ...files(root, 'public')]) {
    if (mediaExtensions.test(path)) assert(coveredFiles.has(path), `New media/font file needs provenance: ${path}`);
    if (!['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.html'].includes(extname(path))) continue;
    const source = read(root, path);
    if (/<svg\b|data:image|<canvas\b|getContext\(|drawImage\(|fillText\(|@font-face|new Audio\(/.test(source)) {
      assert(coveredFiles.has(path), `New inline artwork/font/audio/canvas source needs provenance: ${path}`);
    }
    assert(!/(?:url\(\s*['"]?|\bsrc\s*=\s*['"])(?:https?:)?\/\//i.test(source), `External asset URL needs explicit review and an updated check: ${path}`);
  }
  const icons = [...read(root, 'src/engine.ts').matchAll(/^\[\d+,'[^']+','([^']+)'/gm)].map(match => match[1]);
  const recorded = manifest.assets.find(item => item.id === 'system-emoji').rosterIcons;
  assert(icons.length > 0 && JSON.stringify(icons) === JSON.stringify(recorded), 'Roster emoji changed; update the device-font inventory after review.');
  const notices = expectedNotices(root, manifest);
  assert(read(root, 'public/THIRD_PARTY_NOTICES.txt') === notices, 'Public third-party notices are missing/stale. Review, then run node scripts/check-rights.mjs --write-notices.');
  const credits = read(root, 'public/credits.html');
  assert(credits.includes('href="./THIRD_PARTY_NOTICES.txt"'), 'Credits must link to the complete notices.');
  assert(credits.includes(embeddedNotices(notices)), 'Embedded HTML notices are missing/stale. Run node scripts/check-rights.mjs --write-notices after review.');
  assert(sourceFiles.some(path => read(root, path).includes('credits.html')), 'Game UI must provide a credits link.');
  if (dist) {
    for (const path of ['THIRD_PARTY_NOTICES.txt', 'credits.html']) {
      assert(read(root, `dist/${path}`) === read(root, `public/${path}`), `Built artifact is missing/stale: ${path}`);
    }
    assert(read(root, 'dist/index.html').includes('<script'), 'Built entrypoint is missing.');
    const scripts = files(root, 'dist').filter(path => path.endsWith('.js'));
    assert(scripts.some(path => read(root, path).includes('credits.html')), 'Built game has no credits link.');
    for (const path of files(root, 'dist').filter(path => mediaExtensions.test(path))) {
      assert(coveredFiles.has(`public/${relative('dist', path)}`) || manifest.assets.some(item => item.builtFiles?.includes(relative('dist', path))), `New built media/font file needs inventory: ${path}`);
    }
  }
  return { softwareNotices: manifest.software.length, assetGroups: manifest.assets.length, dist, legalClearance: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--write-notices')) {
      const notices = expectedNotices(defaultRoot);
      const credits = read(defaultRoot, 'public/credits.html');
      assert(credits.split(noticeStart).length === 2 && credits.split(noticeEnd).length === 2, 'Credits needs one pair of third-party notice markers.');
      const start = credits.indexOf(noticeStart), end = credits.indexOf(noticeEnd) + noticeEnd.length;
      assert(end > start, 'Credits notice markers are out of order.');
      writeFileSync(join(defaultRoot, 'public/THIRD_PARTY_NOTICES.txt'), notices);
      writeFileSync(join(defaultRoot, 'public/credits.html'), credits.slice(0, start) + embeddedNotices(notices) + credits.slice(end));
      console.log('Wrote reviewed third-party notices as text and embedded HTML. Run rights:check and build next.');
    } else {
      console.log('Rights inventory checks passed:', checkRights({ dist: process.argv.includes('--dist') }));
      console.log('This checks recorded files/notices, not copyright, trademark, patent, or legal clearance.');
    }
  } catch (error) {
    console.error(`Rights inventory check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
