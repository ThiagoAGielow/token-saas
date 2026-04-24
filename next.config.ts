import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: { serverActions: { allowedOrigins: ['localhost:3000'] } },
  images: { domains: ['img.clerk.com'] },
  async redirects() {
    return [
      { source: '/dashboard/domains',  destination: '/dashboard', permanent: false },
      { source: '/dashboard/emails',   destination: '/dashboard', permanent: false },
      { source: '/dashboard/agency',   destination: '/dashboard', permanent: false },
      { source: '/dashboard/api-keys', destination: '/dashboard', permanent: false },
    ]
  },
}



export default nextConfig
