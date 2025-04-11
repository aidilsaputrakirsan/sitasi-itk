import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'https://hklujrxbbcpnpapmmihj.supabase.co'],
  },
};

export default nextConfig;