import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy configuration for API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*', // Keep local API routes as-is
      },
    ];
  },

  // Add headers for CORS and authentication
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
