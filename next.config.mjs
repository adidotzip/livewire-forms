/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. This allows you to use the optimized <Image /> component 
  // for your logo hosted on Framer.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'framerusercontent.com',
        pathname: '**',
      },
    ],
  },
  
  // 2. (Optional) If you want to deploy IMMEDIATELY without 
  // deleting those unused variables, uncomment the lines below.
  /*
  eslint: {
    ignoreDuringBuilds: true,
  },
  */
};

export default nextConfig;
