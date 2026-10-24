import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: [
    "@prisma/client",
    "@libsql/client",
    "@prisma/adapter-libsql",
    "imapflow",
    "mailparser",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
