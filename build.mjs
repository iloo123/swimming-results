#!/usr/bin/env node
// Inlines data/meet.json into app/template.html -> dist/index.html (one self-contained file).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const data = JSON.parse(await readFile(path.join(root, 'data/meet.json'), 'utf8'));
const template = await readFile(path.join(root, 'viewer/template.html'), 'utf8');

const json = JSON.stringify(data)
  .replace(/</g, '\\u003c')                 // never let the payload close the script tag
  .replace(/\u2028/g, '\\u2028')
  .replace(/[\u0080-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')); // keep the page pure ASCII

// The page's <title> lives in the template (it names the artifact); the app sets
// document.title from the meet name at runtime, so other meets stay correct too.
// app/share-base.txt (optional) holds the page's public URL, so "Share" hands out a
// link that works for the recipient even though the page runs in a sandboxed frame.
let shareBase = '';
try { shareBase = (await readFile(path.join(root, 'viewer/share-base.txt'), 'utf8')).trim(); } catch { /* not published yet */ }

const html = template
  .replace('__MEET_JSON__', () => json)
  .replace('__SHARE_BASE__', () => shareBase);

await mkdir(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist/index.html');
await writeFile(out, html);
console.log(`dist/index.html - ${(html.length / 1024).toFixed(0)} KB, ${data.events.length} events${shareBase ? `, share base ${shareBase}` : ', no share base yet'}`);
