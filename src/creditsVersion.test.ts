import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('keeps the current package version discoverable in credits after removing the game title band', () => {
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const credits = readFileSync(new URL('../public/credits.html', import.meta.url), 'utf8');
  expect(credits).toContain(`<p class="buildVersion">v${version}</p>`);
});
