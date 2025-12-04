import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. Only use this if you're okay with that.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep TypeScript errors during build (only ignore ESLint)
    ignoreBuildErrors: false,
  },
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    // Set the correct root directory for this project
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
