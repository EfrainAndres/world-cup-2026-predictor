import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: "dist",
  transpilePackages: ["@world-cup-2026-predictor/api"],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"]
    };

    return config;
  }
};

export default nextConfig;
