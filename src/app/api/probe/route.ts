export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Boot probe. Every import here is dynamic and wrapped, so this function starts even
 * when something it reaches for does not - which is the only way to find out what.
 */
export async function GET() {
  const out: Record<string, string> = {
    node: process.version,
    region: process.env.VERCEL_REGION ?? 'local',
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
  };

  const step = async (name: string, fn: () => unknown) => {
    try {
      out[name] = `ok ${String(await fn()).slice(0, 90)}`;
    } catch (err) {
      out[name] = `ERR ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`.slice(0, 300);
    }
  };

  await step('decoder', () => new TextDecoder('windows-1252').decode(new Uint8Array([0x92, 0x73])));
  await step('buffer', () => Buffer.from('https://x/').toString('base64url'));
  await step('json', async () => (await import('../../../../data/meet.json')).default?.meet?.title);
  await step('lib/meet-url', async () => (await import('@/lib/meet-url')).decodeMeet('2026-22rjsc'));
  await step('lib/hytek', async () => typeof (await import('@/lib/hytek')).scrapeMeet);
  await step('lib/meet', async () => typeof (await import('@/lib/meet')).loadMeet);
  await step('next/cache', async () => typeof (await import('next/cache')).updateTag);
  await step('fetch origin', async () => {
    const res = await fetch('https://results.mv/2026/22rjsc/evtindex.htm', {
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    return `${res.status} ${(await res.arrayBuffer()).byteLength}B`;
  });

  return Response.json(out);
}
