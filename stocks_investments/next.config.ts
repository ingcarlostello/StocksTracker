import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // The outer StockTracker/ folder has its own package-lock.json; pin the root to this
    // package so Turbopack never resolves or watches files outside the app.
    root: __dirname,
  },
};

export default nextConfig;
