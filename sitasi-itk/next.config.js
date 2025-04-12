/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
      // Disable ESLint during builds
      ignoreDuringBuilds: true,
    },
    // Copy any other settings from your existing next.config.ts
    reactStrictMode: true,
    images: {
      domains: ['localhost', 'https://hklujrxbbcpnpapmmihj.supabase.co'],
    },
  };
  
  module.exports = nextConfig;