/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  experimental: {
    serverComponentsExternalPackages: ['mongoose']
  },
  
  // Configure external domains for images
  images: {
    domains: [
      'localhost',
      's3.marcussviniciusa.cloud', // Your MinIO endpoint
      // Add other domains as needed
    ],
  },
  
  // Environment variables available to the browser
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  
  // Webpack configuration for Docker
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix for socket.io in production builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    return config
  },
  
  // Production optimizations
  poweredByHeader: false,
  generateEtags: false,
  
  // Compression
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig