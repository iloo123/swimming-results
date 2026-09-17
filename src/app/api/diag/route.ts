import { decodeMeet, normalizeMeetUrl } from '@/lib/meet-url';
import { describe } from '@/lib/meet';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * What this server sees when it reaches for a meet. Exists because "it works in my
 * browser" says nothing about whether a serverless function can reach the same host.
 *
 *   /api/diag?meet=2026-22rjsc
 *   /api/diag?url=https://results.mv/2026/22rjsc/index.htm
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const input = params.get('url');
  const slug = params.get('meet') ?? '2026-22rjsc';

  let base: string;
  try {
    base = input ? normalizeMeetUrl(input) : decodeMeet(slug);
  } catch (err) {
    return Response.json({ error: describe(err) }, { status: 400 });
  }

  const candidates = [base, base.startsWith('https://') ? `http://${base.slice(8)}` : ''].filter(Boolean);
  const probes = [];
  for (const candidate of candidates) {
    for (const file of ['evtindex.htm', 'index.htm']) {
      const url = candidate + file;
      const started = Date.now();
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; swim-results-viewer/1.0)', accept: 'text/html,*/*' },
          signal: AbortSignal.timeout(15_000),
        });
        const body = await res.arrayBuffer();
        probes.push({ url, status: res.status, ms: Date.now() - started, bytes: body.byteLength });
      } catch (err) {
        probes.push({ url, error: describe(err), ms: Date.now() - started });
      }
    }
  }

  return Response.json({
    base,
    node: process.version,
    region: process.env.VERCEL_REGION ?? 'local',
    deployment: process.env.VERCEL_URL ?? null,
    probes,
  });
}
