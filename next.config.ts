import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The site opens in Arabic by default; /en is the English version.
    return [{ source: "/", destination: "/ar", permanent: false }];
  },
};

export default nextConfig;
