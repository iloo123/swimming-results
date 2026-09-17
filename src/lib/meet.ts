import { cache } from 'react';
import { scrapeMeet, type Meet, type MeetEvent, type ResultRow, type Section } from './hytek';
import snapshot from '../../data/meet.json';

/** Seconds before a page is re-fetched from the source site. Short enough to follow a live meet. */
export const REVALIDATE = Number(process.env.MEET_REVALIDATE ?? 300);

const SNAPSHOT = snapshot as unknown as Meet;
const decoder = new TextDecoder('windows-1252');

const UA =
  'Mozilla/5.0 (compatible; swim-results-viewer/1.0; +https://vercel.com)'; // some hosts refuse unknown agents

async function getPage(url: string, base: string, timeoutMs: number): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE, tags: ['meet', base] },
    headers: { 'user-agent': UA, accept: 'text/html,*/*' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

/**
 * One page of a meet. Old timing-system hosts are slow and occasionally drop a
 * connection, so each page gets a timeout and a second chance before it counts
 * as "not published yet".
 */
function pageFetcher(base: string, timeoutMs = 12_000) {
  return async (file: string): Promise<string> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // HY-TEK writes windows-1252, not UTF-8 (curly apostrophes in names).
        return decoder.decode(await getPage(base + file, base, timeoutMs));
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error(`${file}: ${describe(lastErr)}`);
  };
}

export const describe = (err: unknown) =>
  err instanceof Error ? `${err.name === 'TimeoutError' ? 'timed out' : err.message}` : String(err);

/** results.mv and its peers predate universal https; fall back if the secure host refuses us. */
const insecureVariant = (base: string) => (base.startsWith('https://') ? `http://${base.slice('https://'.length)}` : '');

export type MeetResult = { ok: true; meet: Meet } | { ok: false; error: string; tried: string[] };

/**
 * The whole meet, deduped per request. Individual pages sit in Next's data cache,
 * so a render after `revalidate` only re-downloads what actually changed upstream.
 *
 * Never throws: a layout that throws escapes its own error boundary and the reader
 * gets a blank platform error page instead of something that says what went wrong.
 */
export const loadMeet = cache(async (base: string): Promise<MeetResult> => {
  const tried: string[] = [];
  for (const candidate of [base, insecureVariant(base)].filter(Boolean)) {
    try {
      const fetchPage = pageFetcher(candidate);
      await fetchPage('evtindex.htm'); // cheap reachability check; the result is cached for the scrape
      return { ok: true, meet: await scrapeMeet(candidate, fetchPage) };
    } catch (err) {
      tried.push(`${candidate} - ${describe(err)}`);
    }
  }

  if (base === SNAPSHOT.meet.source) {
    console.error('[meet] live fetch failed, serving bundled snapshot:', tried.join(' | '));
    return { ok: true, meet: SNAPSHOT };
  }
  return { ok: false, error: tried[0] ?? 'unreachable', tried };
});

/** For pages rendered under a layout that already checked: the meet, or a thrown error. */
export const getMeet = cache(async (base: string): Promise<Meet> => {
  const result = await loadMeet(base);
  if (!result.ok) throw new Error(result.error);
  return result.meet;
});

/**
 * Used by the "open a meet" form: is there a HY-TEK meet at this address, and which
 * protocol actually answers? Returns the base to address the meet by from now on.
 */
export async function resolveMeetBase(base: string): Promise<string> {
  const tried: string[] = [];
  for (const candidate of [base, insecureVariant(base)].filter(Boolean)) {
    try {
      const html = await pageFetcher(candidate, 15_000)('evtindex.htm');
      if (!/<h[23]/i.test(html) || !/href="[^"]+\.htm/i.test(html)) throw new Error('that page is not a meet index');
      return candidate;
    } catch (err) {
      tried.push(`${candidate} - ${describe(err)}`);
    }
  }
  throw new Error(tried.join('; '));
}

/* --------------------------------------------------------------- lookups */

export const FINAL_RE = /final/i;
export const swimmerName = (row: ResultRow) => row.fullName || row.name || '';

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const getEvent = cache(async (base: string, id: string) => (await getMeet(base)).events.find((e) => e.id === id));

/** Everything the sidebar needs, without shipping 2,000 result rows to the browser. */
export interface EventSummary {
  id: string;
  number: number;
  title: string;
  round: string;
  session: number;
  gender: string;
  stroke: string;
  category: string;
  empty: boolean;
}

export const getEventSummaries = cache(
  async (base: string): Promise<EventSummary[]> =>
    (await getMeet(base)).events.map(({ id, number, title, round, session, gender, stroke, category, empty }) => ({
      id,
      number,
      title,
      round,
      session,
      gender,
      stroke,
      category,
      empty,
    })),
);

export interface AthleteSwim {
  eventId: string;
  number: number;
  title: string;
  round: string;
  session: number;
  date: string;
  section: string;
  place: number | null;
  result: string;
  status: string;
  medal: number;
  leg?: number;
  squad?: string;
  team?: string;
}

export interface Athlete {
  slug: string;
  name: string;
  team: string;
  ages: string[];
  swims: AthleteSwim[];
  relays: AthleteSwim[];
  medals: [number, number, number];
}

const medalOf = (row: ResultRow, sec: Section, ev: MeetEvent) =>
  ev.round === 'Finals' && FINAL_RE.test(sec.name) && row.place && row.place <= 3 && !row.status ? row.place : 0;

export const getAthletes = cache(async (base: string): Promise<Athlete[]> => {
  const meet = await getMeet(base);
  const byKey = new Map<string, Athlete>();

  const touch = (name: string, team: string) => {
    const key = athleteKey(name, team);
    let a = byKey.get(key);
    if (!a) byKey.set(key, (a = { slug: '', name, team, ages: [], swims: [], relays: [], medals: [0, 0, 0] }));
    if (name.length > a.name.length) a.name = name; // prefer the untruncated spelling
    return a;
  };

  for (const ev of meet.events)
    for (const sec of ev.sections)
      for (const row of sec.rows) {
        const swim = (extra: Partial<AthleteSwim> = {}): AthleteSwim => ({
          eventId: ev.id,
          number: ev.number,
          title: ev.title,
          round: ev.round,
          session: ev.session,
          date: ev.date,
          section: sec.name,
          place: row.place,
          result: row.result,
          status: row.status,
          medal: medalOf(row, sec, ev),
          ...extra,
        });
        if (row.name) {
          const a = touch(swimmerName(row), row.team);
          a.swims.push(swim());
          if (row.age && !a.ages.includes(row.age)) a.ages.push(row.age);
        }
        for (const leg of row.swimmers ?? []) {
          const a = touch(leg.name, row.team);
          a.relays.push(swim({ leg: leg.leg, squad: row.squad, team: row.team }));
        }
      }

  const bySession = (x: AthleteSwim, y: AthleteSwim) => x.session - y.session || x.number - y.number;
  const used = new Set<string>();
  const athletes = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const a of athletes) {
    a.swims.sort(bySession);
    a.relays.sort(bySession);
    for (const s of [...a.swims, ...a.relays]) if (s.medal) a.medals[s.medal - 1]++;

    const stem = slugify(`${a.name} ${a.team}`);
    let slug = stem;
    for (let n = 2; used.has(slug); n++) slug = `${stem}-${n}`;
    used.add(slug);
    a.slug = slug;
  }
  return athletes;
});

/** name|team -> slug, so a result row can link straight to the swimmer's page. */
export const getSlugLookup = cache(async (base: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const a of await getAthletes(base)) out[athleteKey(a.name, a.team)] = a.slug;
  return out;
});

export const athleteKey = (name: string, team: string) => `${name.toLowerCase().trim()}|${team.toLowerCase().trim()}`;

export const getAthlete = cache(async (base: string, slug: string) =>
  (await getAthletes(base)).find((a) => a.slug === slug),
);

export interface MedalRow {
  team: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

/** Counted here, not published by the meet: the first three places of every published final. */
export const getMedalTable = cache(async (base: string): Promise<MedalRow[]> => {
  const meet = await getMeet(base);
  const rows = new Map<string, MedalRow>();
  for (const ev of meet.events) {
    if (ev.round !== 'Finals') continue;
    for (const sec of ev.sections) {
      if (!FINAL_RE.test(sec.name)) continue;
      for (const row of sec.rows) {
        if (!row.place || row.place > 3 || row.status) continue;
        const r = rows.get(row.team) ?? { team: row.team, gold: 0, silver: 0, bronze: 0, total: 0 };
        if (row.place === 1) r.gold++;
        else if (row.place === 2) r.silver++;
        else r.bronze++;
        r.total++;
        rows.set(row.team, r);
      }
    }
  }
  return [...rows.values()].sort(
    (a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.team.localeCompare(b.team),
  );
});

export const getStats = cache(async (base: string) => {
  const meet = await getMeet(base);
  const athletes = await getAthletes(base);
  return {
    events: meet.events.filter((e) => !e.empty).length,
    swimmers: athletes.length,
    teams: meet.teams.length,
    results: meet.events.reduce((n, e) => n + e.sections.reduce((m, s) => m + s.rows.length, 0), 0),
  };
});

export const firstPublishedEventId = cache(async (base: string) => {
  const meet = await getMeet(base);
  return (meet.events.find((e) => !e.empty) ?? meet.events[0])?.id ?? '';
});

export const SNAPSHOT_SOURCE = SNAPSHOT.meet.source;

export const SNAPSHOT_MEET = { source: SNAPSHOT.meet.source, title: SNAPSHOT.meet.title, dates: SNAPSHOT.meet.dates };
