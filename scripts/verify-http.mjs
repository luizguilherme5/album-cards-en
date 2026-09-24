import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:3850';
const state = await (await fetch(base + '/api/state')).json();
assert.equal(state.config.plexToken, undefined);
const bad = await fetch(base + '/api/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});
assert.equal(bad.status, 403);
const cross = await fetch(base + '/api/state', {
  headers: { Origin: 'https://unrelated.example' },
});
assert.equal(cross.status, 403);
const sample = state.albums.find((a) => a.title === 'First Light · Demo');
assert.ok(sample?.vertical);
const headers = { 'Content-Type': 'application/json', 'X-Album-Cards': state.csrf };
const response = await fetch(base + '/api/pdf', {
  method: 'POST',
  headers,
  body: JSON.stringify({ kind: 'front', ids: Array(10).fill(sample.id) }),
});
assert.equal(response.status, 200);
assert.match(response.headers.get('content-type'), /pdf/);
await writeFile('/tmp/album-cards-sheet.pdf', Buffer.from(await response.arrayBuffer()));
const exported = await (await fetch(base + '/api/albums/' + sample.id + '/export')).json();
assert.equal(exported.source, undefined);
assert.equal(exported.vertical, undefined);
console.log('HTTP checks passed: CSRF, origin, export privacy and 10-card PDF.');
