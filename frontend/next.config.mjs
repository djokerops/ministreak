/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow images from celoscan and other domains
  images: {
    domains: ["celoscan.io", "alfajores.celoscan.io"],
  },
  // Ensure viem/wagmi work with Next.js App Router
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
