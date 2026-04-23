/** @type {import('next').NextConfig} */
const nextConfig = {
  // Никаких output: 'export'!
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;