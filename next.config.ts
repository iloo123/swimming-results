import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The scraper and the legacy single-file build are plain scripts, not part of the app.
  outputFileTracingExcludes: { '*': ['cache/**', 'dist/**', 'viewer/**'] },
  experimental: { optimizePackageImports: [] },
};

export default nextConfig;
