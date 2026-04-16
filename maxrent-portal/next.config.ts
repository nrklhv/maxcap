import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permitir imágenes de Google (para avatars OAuth)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
