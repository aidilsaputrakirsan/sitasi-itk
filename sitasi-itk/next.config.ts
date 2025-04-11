import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'your-supabase-project.supabase.co'],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib'],
  },
};

export default nextConfig;