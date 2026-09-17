/**
 * Parser for HY-TEK "Real Time Results" meet sites (the frameset of fixed-width
 * <pre> pages that results.mv publishes).
 *
 * Two details drive the whole thing:
 *  - Columns are sliced, not split. Names are padded and truncated, teams contain
 *    spaces, and each time is right-aligned to the END column of its header label,
 *    which is the only way to tell a Seed from a Prelim when a swimmer has a single
 *    time on the line.
 *  - Pages are windows-1252, not UTF-8 (curly apostrophes in names like Min'aam).
 */

export interface Session {
  number: number;
  name: string;
  time: string;
  weekday: string;
  date: string;
}

export interface RelayLeg {
  leg: number;
  name: string;
  age: string;
}

export interface ResultRow {
  place: number | null;
  team: string;
  name?: string;
  fullName?: string;
  age?: string;
  squad?: string;
  swimmers?: RelayLeg[];
  times: { label: string; value: string }[];
  result: string;
  status: string;
  cut?: boolean;
}

export interface Section {
  name: string;
  rows: ResultRow[];
}

export interface MeetEvent {
  id: string;
  file: string;
  url: string;
  number: number;
  label: string;
  title: string;
  round: string;
  session: number;
  date: string;
  stamp: string;
  relay: boolean;
  columns: string[];
  sections: Section[];
  empty: boolean;
  gender: string;
  stroke: string;
  category: string;
  distance: number | null;
}

export interface Meet {
  meet: { title: string; dates: string; source: string; scrapedAt: string };
  sessions: Session[];
  teams: string[];
  events: MeetEvent[];
}

export type PageFetcher = (file: string) => Promise<string>;

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '');
const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
const clean = (s: string) => decodeEntities(stripTags(s)).replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------- index */

interface IndexEntry {
  file: string;
  label: string;
}

export function parseIndex(html: string) {
  const title = clean(/<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html)?.[1] ?? 'Meet Results');
  const dates = clean(
    /<p align="center">\s*(\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*\d{1,2}\/\d{1,2}\/\d{4})/i.exec(html)?.[1] ?? '',
  );

  const sessions: (Session & { events: IndexEntry[] })[] = [];
  for (const chunk of html.split(/<h3>/i).slice(1)) {
    const head = clean(chunk.slice(0, chunk.indexOf('</h3>')));
    const m = head.match(
      /^Session\s+(\d+)\s*-\s*(.*?)\s+((?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day)\s+(\d{1,2}\/\d{1,2}\/\d{4})$/i,
    );
    const session = {
      number: m ? Number(m[1]) : sessions.length + 1,
      name: m ? `Session ${m[1]}` : head,
      time: m ? m[2] : '',
      weekday: m ? m[3] : '',
      date: m ? m[4] : '',
      events: [] as IndexEntry[],
    };
    const linkRe = /<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm: RegExpExecArray | null;
    while ((lm = linkRe.exec(chunk))) {
      const label = clean(lm[2]);
      if (/^#\d/.test(label)) session.events.push({ file: lm[1], label });
    }
    if (session.events.length) sessions.push(session);
  }
  return { title, dates, sessions };
}

/* -------------------------------------------------------------- event page */

const STROKES: [RegExp, string][] = [
  [/Freestyle Relay|Free Relay/i, 'Free Relay'],
  [/Medley Relay/i, 'Medley Relay'],
  [/Individual Medley|\bIM\b/i, 'IM'],
  [/Freestyle|\bFree\b/i, 'Freestyle'],
  [/Backstroke|\bBack\b/i, 'Backstroke'],
  [/Breaststroke|\bBreast\b/i, 'Breaststroke'],
  [/Butterfly|\bFly\b/i, 'Butterfly'],
];

const CATEGORIES: [RegExp, string][] = [
  [/HIGHER\s+SCONDARY|HIGHER\s+SECONDARY/i, 'Higher Secondary'],
  [/LOWER\s+SECONDARY/i, 'Lower Secondary'],
  [/\bSECONDARY\b/i, 'Secondary'],
  [/\bEAD\b/i, 'EAD'],
];

function facets(title: string, label: string) {
  const src = `${title} ${label}`;
  const gender = /\bMixed\b/i.test(src)
    ? 'Mixed'
    : /\bGirls\b|\bWomen\b/i.test(src)
      ? 'Girls'
      : /\bBoys\b|\bMen\b/i.test(src)
        ? 'Boys'
        : '';
  const dist =
    title.match(/\b(\d{2,4})\s+(?:SC|LC)\s+Meter/i) ?? src.match(/\b(\d{2,4})\b\s*(?:m|Free|Back|Breast|Fly|IM)/i);
  return {
    gender,
    stroke: STROKES.find(([re]) => re.test(src))?.[1] ?? '',
    category: CATEGORIES.find(([re]) => re.test(src))?.[1] ?? '',
    distance: dist ? Number(dist[1]) : null,
    relay: /Relay/i.test(src),
  };
}

// Verified against every page of the 2026 meet.
const IND = { place: [0, 4], name: [4, 26], age: [26, 29], team: [29, 46], rest: 46 } as const;
const RELAY = { place: [0, 4], team: [4, 36], rest: 36 } as const;

const cut = (line: string, [a, b]: readonly [number, number]) => (line.slice(a, b) || '').trim();
const TIME_TOKEN = /^(?:X?\d{0,2}:?\d{1,2}\.\d{2}[A-Za-z]?|DQ|NS|NT|DFS|SCR|---)$/;

function parseRelayLegs(line: string): RelayLeg[] {
  const out: RelayLeg[] = [];
  const marks = [...line.matchAll(/[1-8]\)/g)];
  marks.forEach((mk, i) => {
    const start = mk.index! + 2;
    const seg = line.slice(start, i + 1 < marks.length ? marks[i + 1].index : line.length).trim();
    if (!seg) return;
    const am = seg.match(/^(.*?)\s+([MW]?\d{1,2})$/);
    out.push({ leg: Number(mk[0][0]), name: (am ? am[1] : seg).trim(), age: am ? am[2] : '' });
  });
  return out;
}

type EventMeta = Omit<
  MeetEvent,
  'title' | 'stamp' | 'relay' | 'columns' | 'sections' | 'empty' | 'gender' | 'stroke' | 'category' | 'distance'
>;

export function parseEvent(html: string, meta: EventMeta): MeetEvent {
  const base = { ...meta, title: '', stamp: '', relay: false, columns: [] as string[], sections: [] as Section[], empty: true };
  const pre = /<pre>([\s\S]*?)<\/pre>/i.exec(html);
  if (!pre) return { ...base, ...facets(meta.label, meta.label), title: meta.label };

  const lines = decodeEntities(pre[1].replace(/<span><\/span>/g, ''))
    .split('\n')
    .map((l) => stripTags(l).replace(/\r$/, '').replace(/\s+$/, ''));

  const titleLine = lines.find((l) => /^\s*Event\s+\d+/i.test(l)) ?? '';
  const title = titleLine.replace(/^\s*Event\s+\d+\s*/i, '').trim() || meta.label;
  const number = Number(/Event\s+(\d+)/i.exec(titleLine)?.[1] ?? meta.number);
  const stamp = clean(lines.find((l) => /Site License/i.test(l)) ?? '').replace(/^.*?Site License\s*/i, '');

  const headerIdx = lines.findIndex((l) => /^\s+(Name|Team)\s/.test(l));
  const header = headerIdx >= 0 ? lines[headerIdx] : '';
  const relay = /^\s+Team\s/.test(header);
  const timeCols = [...header.matchAll(/\S+/g)]
    .filter((m) => /^(Seed|Prelims|Finals|Time|Points)$/i.test(m[0]))
    .map((m) => ({ name: m[0], end: m.index! + m[0].length }));
  const columns = timeCols.map((c) => c.name);

  const sections: Section[] = [];
  let current: Section | null = null;
  const push = (row: ResultRow) => {
    if (!current) {
      current = { name: columns.includes('Finals') && !columns.includes('Prelims') ? 'Finals' : 'Results', rows: [] };
      sections.push(current);
    }
    current.rows.push(row);
  };

  for (const line of lines.slice(headerIdx + 1)) {
    const t = line.trim();
    if (!t || /^=+$/.test(t)) continue;

    const head = t.match(/^===\s*(.+?)\s*===$/);
    if (head) {
      current = { name: head[1], rows: [] };
      sections.push(current);
      continue;
    }
    if (/^-+$/.test(t)) {
      // heat / qualifying divider - remember it, but don't invent a meaning for it
      const rows = current?.rows;
      if (rows?.length) rows[rows.length - 1].cut = true;
      continue;
    }
    if (relay && /^[1-8]\)/.test(t)) {
      const last = current?.rows[current.rows.length - 1];
      if (last) last.swimmers = (last.swimmers ?? []).concat(parseRelayLegs(line));
      continue;
    }

    const shape = relay ? RELAY : IND;
    const placeRaw = cut(line, shape.place);
    if (!/^(\d+|--)$/.test(placeRaw)) continue;

    const times = timeCols.map((c, i) => {
      const v = line.slice(i === 0 ? shape.rest : timeCols[i - 1].end, c.end).trim();
      return { label: c.name, value: TIME_TOKEN.test(v) ? v : '' };
    });
    const filled = times.filter((x) => x.value);
    const result = filled.length ? filled[filled.length - 1].value : '';

    const row: ResultRow = {
      place: placeRaw === '--' ? null : Number(placeRaw),
      team: cut(line, relay ? RELAY.team : IND.team),
      times,
      result,
      status: /^(DQ|NS|DFS|SCR|NT)$/.test(result) ? result : '',
    };
    if (relay) {
      const sq = row.team.match(/^(.*?)\s*'([A-Z])'$/);
      if (sq) {
        row.team = sq[1].trim();
        row.squad = sq[2];
      }
      row.swimmers = [];
    } else {
      row.name = cut(line, IND.name);
      row.age = cut(line, IND.age);
    }
    push(row);
  }

  return {
    ...base,
    ...facets(title, meta.label),
    number,
    title,
    stamp,
    relay,
    columns,
    sections,
    empty: sections.length === 0,
  };
}

/* ------------------------------------------------------------------ meet */

/** Individual lines truncate names to 21 chars; relay legs carry the full spelling. */
function resolveTruncatedNames(events: MeetEvent[]) {
  const full = new Map<string, string | null>();
  for (const ev of events)
    for (const sec of ev.sections)
      for (const row of sec.rows)
        for (const sw of row.swimmers ?? []) {
          const k = `${row.team}|${sw.name.slice(0, 21)}`;
          const prev = full.get(k);
          if (prev === undefined) full.set(k, sw.name);
          else if (prev !== sw.name) full.set(k, null); // ambiguous - leave it truncated
        }
  for (const ev of events)
    for (const sec of ev.sections)
      for (const row of sec.rows) {
        if (!row.name || row.name.length < 21) continue;
        const match = full.get(`${row.team}|${row.name}`);
        if (match && match !== row.name) row.fullName = match;
      }
}

export async function scrapeMeet(base: string, fetchPage: PageFetcher): Promise<Meet> {
  const index = parseIndex(await fetchPage('evtindex.htm'));

  const metas: EventMeta[] = [];
  for (const session of index.sessions)
    for (const entry of session.events) {
      const m = entry.label.match(/^#(\d+)\s*(.*)$/);
      const label = m ? m[2] : entry.label;
      metas.push({
        id: entry.file.replace(/\.html?$/i, ''),
        file: entry.file,
        url: base + entry.file,
        number: m ? Number(m[1]) : 0,
        label,
        round: /\bFinals\b/i.test(label) ? 'Finals' : /\bPrelims\b/i.test(label) ? 'Prelims' : '',
        session: session.number,
        date: session.date,
      });
    }

  const events = await mapWithConcurrency(metas, 12, async (meta) => {
    try {
      return parseEvent(await fetchPage(meta.file), meta);
    } catch {
      return parseEvent('', meta); // a page that will not load reads as "not published yet"
    }
  });
  resolveTruncatedNames(events);

  const teams = [
    ...new Set(events.flatMap((e) => e.sections.flatMap((s) => s.rows.map((r) => r.team)))),
  ]
    .filter(Boolean)
    .sort();

  return {
    meet: { title: index.title, dates: index.dates, source: base, scrapedAt: new Date().toISOString() },
    sessions: index.sessions.map(({ events: _events, ...s }) => s),
    teams,
    events,
  };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}
