import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: { serverActions: { allowedOrigins: ['localhost:3000'] } },
  images: { domains: ['img.clerk.com'] },
};

export default nextConfig;
