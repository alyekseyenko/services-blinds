/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'fieldops_production',
  outputFileTracingExcludes: {
    '*': [
      'backups/**',
      'scripts/**',
      'docs/**',
      'e2e/**',
      '**/*.sql',
      '**/*.md',
      '**/*.docx',
      '**/*.jpg',
      'playwright-report/**',
      'test-results/**',
      'src/scratch/**',
    ],
  },
  allowedDevOrigins: ['nearly-preorder-groin.ngrok-free.dev', 'spotty-hoops-melt.loca.lt'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|icon-|apple-touch|favicon|manifest).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), geolocation=(self), microphone=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

