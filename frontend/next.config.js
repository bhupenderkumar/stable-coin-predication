/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: ['raw.githubusercontent.com', 'arweave.net', 'www.arweave.net'],
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'Solana Meme Trading Bot',
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
  },
};

module.exports = nextConfig;
