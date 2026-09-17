# Swim results viewer

Reads a HY-TEK "Real Time Results" meet - the frameset of fixed-width `<pre>` pages that
sites like `results.mv` publish - and serves it as something you can actually navigate:
an event picker, filters, a page per swimmer, a medal table, and a link per view.

You paste the meet link; everything else is derived from it. Nothing is hard-coded to one meet.

```
https://results.mv/2026/22rjsc/index.htm   ->   /m/2026-22rjsc/event/260905F204
```

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
npm run lint           # tsc --noEmit
```

## Deploy to Vercel

The repo root is the app - no root-directory setting needed.

```bash
npx vercel login
npx vercel            # preview
npx vercel --prod     # production
```

Or push to GitHub and import the repo at vercel.com/new (framework is detected as Next.js).

| Env var | Default | What it does |
| --- | --- | --- |
| `MEET_REVALIDATE` | `300` | Seconds a source page is cached before it is re-fetched |
| `NEXT_PUBLIC_SITE_URL` | Vercel's production URL | Absolute base for share-card image URLs |

`vercel.json` pins the functions to `sin1` (Singapore) - the closest region to the Maldives.
Change or drop it if your meets are hosted elsewhere.

## Routes

| Route | What it renders |
| --- | --- |
| `/` | Paste-a-meet-link form, recent meets, the bundled example |
| `/m/[meet]` | Redirects to the meet's first published event |
| `/m/[meet]/event/[id]` | One event: sections, places, times, relay legs |
| `/m/[meet]/swimmers` | Every swimmer; `?team=` narrows it |
| `/m/[meet]/swimmer/[slug]` | One swimmer: individual swims, relay legs, medals |
| `/m/[meet]/medals` | Medals per school, counted from published finals |

`[meet]` is the source URL: `2026-22rjsc` for a results.mv meet, `u-<base64url>` for anything else.
Event and swimmer routes also serve an `opengraph-image`, so a shared link previews as a result card.

## How the data flows

1. `evtindex.htm` gives the sessions and the event list.
2. Every event page is fetched (12 at a time) and parsed.
3. Each fetch is cached by Next for `MEET_REVALIDATE` seconds and tagged with the meet URL,
   so a re-render only re-downloads what changed upstream. **Refresh now** in the header drops
   that cache for the current meet - the button to press while a meet is still running.
4. If the source site is unreachable and you asked for the meet in `data/meet.json`,
   the bundled snapshot is served instead of an error.

## How the parsing works

The event pages are fixed-width text inside `<pre>`. Two details matter:

- **Columns are sliced, not split.** Names are padded and truncated, teams contain spaces, and
  times are right-aligned to the *end column* of their header label (`Seed` / `Prelims` / `Finals`).
  Slicing on those header offsets is the only way to tell a seed time from a prelim time when a
  swimmer has a single time on the line - split on whitespace and everyone who missed the final
  lands in the finals column.
- **Encoding is windows-1252**, not UTF-8 (curly apostrophes in names such as `Min'aam`).

Individual result lines truncate names to 21 characters; relay leg lines carry the full spelling,
so the parser back-fills full names where the match is unambiguous (419 of them in the 2026 meet)
and a swimmer's entries group under one page.

## Layout

| Path | What it is |
| --- | --- |
| `src/app/` | Routes (App Router) |
| `src/components/` | Client pieces: sidebar, filters, tables, share buttons |
| `src/lib/hytek.ts` | The parser - the only place that knows the HY-TEK format |
| `src/lib/meet.ts` | Fetching, caching, and the derived indexes (athletes, medals, slugs) |
| `src/lib/meet-url.ts` | URL normalising, the `[meet]` slug, and the private-address guard |
| `scripts/snapshot.mts` | `npm run snapshot` - writes `data/meet.json` from a live meet |
| `viewer/`, `build.mjs` | The older single-file build: `npm run static` -> `dist/index.html` |
| `cache/` | Raw pages kept by the snapshot script (`-- --fresh` re-downloads) |

```bash
npm run snapshot                                  # refresh data/meet.json (default meet)
npm run snapshot -- https://results.mv/2027/x/    # a different meet
npm run static                                    # dist/index.html, one self-contained file
```

## Notes and limits

- Pasted links are normalised and checked before use: http/https only, and addresses that
  resolve to localhost or a private range are refused.
- A swimmer's medal tally includes relay legs; the medal *table* counts a relay once for the school.
- Times are unofficial, exactly as the source states. Rankings and medal counts are computed here.
- In the 2026 meet, event #402 (Boys 50 Back Higher Secondary, Prelims) is published empty
  upstream - the page says so rather than inventing rows.
