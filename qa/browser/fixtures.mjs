import { test as base, expect } from '@playwright/test';
export { expect };
export const test = base.extend({
  browserErrors: [async ({ context, browser }, use, info) => {
    await info.attach('runtime-identity', { body: JSON.stringify({ browserVersion: browser.version(), candidate: process.env.QA_CANDIDATE, sourceSha: process.env.QA_SOURCE_SHA ?? 'local-unverified', project: info.project.name, viewport: info.project.use.viewport }), contentType: 'application/json' });
    const errors = [];
    const listen = page => page.on('pageerror', error => errors.push(error.message));
    context.pages().forEach(listen);
    context.on('page', listen);
    await use();
    context.off('page', listen);
    expect(errors, 'No uncaught page errors, including startup and secondary pages').toEqual([]);
  }, { auto: true }],
});
