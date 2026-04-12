/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "maxrent.cl" }],
        destination: "https://www.maxrent.cl/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
