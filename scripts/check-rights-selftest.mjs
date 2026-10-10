import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRights } from './check-rights.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temp = [];
afterEach(() => { for (const root of temp.splice(0)) rmSync(root, { recursive: true, force: true }); });
function put(root, path, text) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
function change(root, path, edit) { put(root, path, edit(readFileSync(join(root, path), 'utf8'))); }
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'arena-rights-test-')); temp.push(root);
  for (const path of ['src', 'public', 'docs/rights', 'package-lock.json']) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(repo, path), join(root, path), { recursive: true });
  }
  for (const name of ['react', 'react-dom', 'scheduler', 'vite']) {
    for (const filename of ['package.json', name === 'vite' ? 'LICENSE.md' : 'LICENSE']) {
      const path = `node_modules/${name}/${filename}`;
      put(root, path, readFileSync(join(repo, path), 'utf8'));
    }
  }
  // Controlled UI/build fixtures test the checker, not the game rendering.
  put(root, 'src/rightsFixture.tsx', 'export const fixture = <a href="credits.html">Credits</a>;');
  for (const path of ['credits.html', 'THIRD_PARTY_NOTICES.txt']) put(root, `dist/${path}`, readFileSync(join(root, `public/${path}`), 'utf8'));
  put(root, 'dist/index.html', '<script type="module" src="./assets/game.js"></script>');
  put(root, 'dist/assets/game.js', 'const credits = "credits.html";');
  return root;
}
test('reviewed inventory and copied production notices pass without claiming legal clearance', () => {
  const result = checkRights({ root: fixture(), dist: true });
  assert.equal(result.softwareNotices, 5);
  assert.equal(result.legalClearance, false);
});
test('removing a public notice is detected', () => {
  const root = fixture(); put(root, 'public/THIRD_PARTY_NOTICES.txt', 'missing text');
  assert.throws(() => checkRights({ root }), /notices are missing\/stale/);
});
test('a changed installed license requires review', () => {
  const root = fixture(); change(root, 'node_modules/react/LICENSE', value => value.replace('Meta Platforms', 'Different Owner'));
  assert.throws(() => checkRights({ root }), /License text changed/);
});
test('a locked package upgrade requires review', () => {
  const root = fixture(); change(root, 'package-lock.json', value => { const data = JSON.parse(value); data.packages['node_modules/react'].version = '99.0.0'; return JSON.stringify(data); });
  assert.throws(() => checkRights({ root }), /Locked version changed/);
});
test('a newly shipped production dependency requires review', () => {
  const root = fixture(); change(root, 'package-lock.json', value => { const data = JSON.parse(value); data.packages['node_modules/unreviewed'] = { version: '1.0.0', license: 'MIT' }; return JSON.stringify(data); });
  assert.throws(() => checkRights({ root }), /New production dependency/);
});
test('a changed SVG needs a reviewed manifest update', () => {
  const root = fixture(); change(root, 'src/fenrirArt.ts', value => value + '\n// Changed drawing\n');
  assert.throws(() => checkRights({ root }), /Artwork changed/);
});
test('new physical media and new inline art are detected', () => {
  const root = fixture(); put(root, 'public/new.svg', '<svg/>');
  assert.throws(() => checkRights({ root }), /New media\/font file/);
  rmSync(join(root, 'public/new.svg')); put(root, 'src/newArt.ts', 'export const drawing = `<svg/>`;');
  assert.throws(() => checkRights({ root }), /New inline artwork/);
});
test('a new external asset URL is flagged', () => {
  const root = fixture(); put(root, 'src/new.css', '.x{background:url(https://example.com/art.png)}');
  assert.throws(() => checkRights({ root }), /External asset URL/);
});
test('roster emoji changes need an inventory update', () => {
  const root = fixture(); change(root, 'src/engine.ts', value => value.replace("[0,'妖狐','🦊'", "[0,'妖狐','🐱'"));
  assert.throws(() => checkRights({ root }), /Roster emoji changed/);
});
test('missing built notices and missing compiled credits link are detected', () => {
  const root = fixture(); put(root, 'dist/THIRD_PARTY_NOTICES.txt', 'incomplete');
  assert.throws(() => checkRights({ root, dist: true }), /Built artifact is missing\/stale/);
  put(root, 'dist/THIRD_PARTY_NOTICES.txt', readFileSync(join(root, 'public/THIRD_PARTY_NOTICES.txt'), 'utf8'));
  put(root, 'dist/assets/game.js', 'const broken = true;');
  assert.throws(() => checkRights({ root, dist: true }), /Built game has no credits link/);
});
test('credits must retain a route to the full notices', () => {
  const root = fixture(); change(root, 'public/credits.html', value => value.replace('href="./THIRD_PARTY_NOTICES.txt"', 'href="./other.txt"'));
  assert.throws(() => checkRights({ root }), /Credits must link/);
});

test('a newly generated media file is not silently omitted from the inventory', () => {
  const root = fixture(); put(root, 'dist/assets/unreviewed.png', 'placeholder');
  assert.throws(() => checkRights({ root, dist: true }), /New built media\/font file/);
});
test('the source must expose a credits route as well as the public page', () => {
  const root = fixture();
  function removeLink(dir) {
    for (const item of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${item.name}`;
      if (item.isDirectory()) removeLink(path);
      else if (readFileSync(join(root, path), 'utf8').includes('credits.html')) change(root, path, value => value.replaceAll('credits.html', 'removed.html'));
    }
  }
  removeLink('src');
  assert.throws(() => checkRights({ root }), /Game UI must provide a credits link/);
});

test('HTML must contain the same complete notice text as the text file', () => {
  const root = fixture(); change(root, 'public/credits.html', value => value.replace('Permission is hereby granted', 'Permission text omitted'));
  assert.throws(() => checkRights({ root }), /Embedded HTML notices are missing\/stale/);
});
