/**
 * A meet is addressed by the URL the user pastes (any page of the HY-TEK frameset);
 * everything else is derived from the folder it lives in.
 */

/** "results.mv/2026/22rjsc/index.htm" -> "https://results.mv/2026/22rjsc/" */
export function normalizeMeetUrl(input: string): string {
  const raw = input.trim();
  if (!raw) throw new Error('Paste a meet results link first.');
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error(`"${raw}" is not a link.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http and https links work.');
  if (isPrivateHost(url.hostname)) throw new Error('That address is not reachable from the internet.');

  url.hash = '';
  url.search = '';
  // Any page of the frameset identifies the meet - keep the folder it sits in.
  if (/\.(html?|htm)$/i.test(url.pathname)) url.pathname = url.pathname.replace(/[^/]*$/, '');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.toString();
}

function isPrivateHost(host: string) {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;
  if (h === '::1' || h.startsWith('[::1')) return true;
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ip) return false;
  const [a, b] = [Number(ip[1]), Number(ip[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/**
 * URL <-> route segment. results.mv meets get a readable slug ("2026-22rjsc");
 * anything else is carried base64url so the app is not tied to one host.
 */
export function encodeMeet(base: string): string {
  const m = base.match(/^https:\/\/results\.mv\/(\d{4})\/([^/]+)\/$/i);
  if (m) return `${m[1]}-${m[2]}`;
  return 'u-' + Buffer.from(base, 'utf8').toString('base64url');
}

export function decodeMeet(slug: string): string {
  if (slug.startsWith('u-')) {
    const base = Buffer.from(slug.slice(2), 'base64url').toString('utf8');
    return normalizeMeetUrl(base);
  }
  const m = slug.match(/^(\d{4})-(.+)$/);
  if (!m) throw new Error('Unknown meet.');
  return `https://results.mv/${m[1]}/${m[2]}/`;
}

export const meetPath = (base: string, rest = '') => `/m/${encodeMeet(base)}${rest}`;
