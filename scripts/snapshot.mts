#!/usr/bin/env tsx
/**
 * Writes data/meet.json - the offline snapshot used as a fallback by the app and as
 * the input to the legacy single-file build (`npm run static`).
 *
 *   npm run snapshot -- [meetUrl] [--fresh]
 *
 * Pages are cached under cache/ so re-runs are free; --fresh re-downloads.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { scrapeMeet } from '../src/lib/hytek.ts';
import { normalizeMeetUrl } from '../src/lib/meet-url.ts';

const args = process.argv.slice(2);
const fresh = args.includes('--fresh');
const base = normalizeMeetUrl(args.find((a) => !a.startsWith('--')) ?? 'https://results.mv/2026/22rjsc/');

const root = path.resolve(import.meta.dirname, '..');
const cacheDir = path.join(root, 'cache');
const decoder = new TextDecoder('windows-1252');

await mkdir(cacheDir, { recursive: true });
await mkdir(path.join(root, 'data'), { recursive: true });

let downloaded = 0;
async function fetchPage(file: string): Promise<string> {
  const cached = path.join(cacheDir, file);
  if (!fresh && existsSync(cached)) {
    const buf = await readFile(cached);
    if (buf.length) return decoder.decode(buf);
  }
  const res = await fetch(base + file);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(cached, buf);
  downloaded++;
  return decoder.decode(buf);
}

const meet = await scrapeMeet(base, fetchPage);
const out = path.join(root, 'data/meet.json');
await writeFile(out, JSON.stringify(meet));

const rows = meet.events.reduce((n, e) => n + e.sections.reduce((m, s) => m + s.rows.length, 0), 0);
const missing = meet.events.filter((e) => e.empty);
console.log(
  `${meet.meet.title}\n${meet.events.length} events, ${rows} result rows, ${meet.teams.length} teams` +
    ` (${downloaded} pages downloaded) -> data/meet.json`,
);
if (missing.length) console.log(`no results published for: ${missing.map((e) => `#${e.number} ${e.round}`).join(', ')}`);
