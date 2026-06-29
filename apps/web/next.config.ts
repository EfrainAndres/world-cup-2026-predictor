import path from "node:path";
import type { NextConfig } from "next";

const workspaceSourceRoots = [
  path.resolve(process.cwd(), "../../packages/api/src"),
  path.resolve(process.cwd(), "../../packages/model/src")
];

// Monorepo root: apps/web lives two levels below the repo root.
// outputFileTracingRoot must point here so @vercel/nft can resolve
// files outside the Next.js app directory (e.g. docs/ artifacts).
const MONOREPO_ROOT = path.resolve(process.cwd(), "../..");

// StatsBomb compact artifacts are loaded at runtime via readFileSync
// with a path derived from import.meta.url.  @vercel/nft cannot
// statically trace dynamic paths, so we declare them explicitly.
// Paths are relative to the Next.js app directory (apps/web/), which is
// process.cwd() during a Next.js build.
const STATSBOMB_TRACING_INCLUDES = [
  "../../docs/model-results/artifacts/statsbomb-team-performance-profiles.json",
  "../../docs/model-results/artifacts/statsbomb-backtesting-expanded-elo.json"
];

function isWorkspaceSourceContext(context: string): boolean {
  return workspaceSourceRoots.some((root) => {
    const relativePath = path.relative(root, context);

    return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
  });
}

const nextConfig: NextConfig = {
  transpilePackages: ["@world-cup-2026-predictor/api"],
  outputFileTracingRoot: MONOREPO_ROOT,
  outputFileTracingIncludes: {
    "/**": STATSBOMB_TRACING_INCLUDES
  },
  // postgres uses node: built-in imports (node:fs, node:path, node:net, etc.)
  // that webpack cannot bundle. Mark it as a server-only external so Next.js
  // requires it at runtime rather than attempting to bundle it.
  serverExternalPackages: ["postgres"],
  webpack(config, { webpack, isServer }) {
    if (!isServer) {
      // These Node.js built-ins are used by server-only packages (e.g. postgres).
      // They are never called in client code; providing empty modules prevents
      // webpack from failing when it encounters them while tree-shaking the
      // transpiled API package.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
        perf_hooks: false
      };
    }

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:crypto$/, "crypto"),
      new webpack.NormalModuleReplacementPlugin(
        /^\..*\.js$/,
        (resource: { context?: string; request: string }) => {
          if (typeof resource.context !== "string" || !isWorkspaceSourceContext(resource.context)) {
            return;
          }

          resource.request = resource.request.replace(/\.js$/, ".ts");
        }
      )
    );

    return config;
  }
};

export default nextConfig;
