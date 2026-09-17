import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Mono, Public_Sans } from 'next/font/google';
import './globals.css';

const display = Archivo({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display', display: 'swap' });
const body = Public_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono', display: 'swap' });

/** Absolute URLs for share cards: Vercel supplies the production host at build time. */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Swim Results', template: '%s - Swim Results' },
  description: 'Read HY-TEK Real Time Results meets: pick an event, filter, follow a swimmer, share a link.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The font variables go on <html> so :root can compose them into --display/--body/--mono.
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
