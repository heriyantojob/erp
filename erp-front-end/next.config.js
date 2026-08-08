const apiUrl = process.env.NEXT_PUBLIC_API_URL_EXPRESS || "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  turbopack: {
    root: __dirname,
  },

  async rewrites() {
    const base = apiUrl.replace(/\/+$/, "");
    return [
      {
        source: "/api/auth/:path*",
        destination: `${base}/api/auth/:path*`,
      },
      {
        source: "/api/erp/:path*",
        destination: `${base}/api/erp/:path*`,
      },
      {
        source: "/api/erp-health",
        destination: `${base}/health`,
      },
    ];
  },
};

module.exports = nextConfig;
