/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Ignore the warnings from @supabase/realtime-js
    config.ignoreWarnings = [
      { module: /@supabase\/realtime-js/ }
    ];
    return config;
  },
}

export default nextConfig

