import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

it('excludes command controls from scroll anchoring before and during target transitions', () => {
  // Contract only: native browser measurements must establish actual stability.
  // Applying this only to .choosingAlly would leave the pre-entry skill anchor eligible.
  expect(css).toMatch(/(?:^|\n)\.commandDock\s*\{\s*overflow-anchor\s*:\s*none\s*;?\s*\}/);
});
