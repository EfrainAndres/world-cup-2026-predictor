import path from "node:path";
import type { NextConfig } from "next";

const workspaceSourceRoots = [
  path.resolve(process.cwd(), "../../packages/api/src"),
  path.resolve(process.cwd(), "../../packages/model/src")
];

function isWorkspaceSourceContext(context: string): boolean {
  return workspaceSourceRoots.some((root) => {
    const relativePath = path.relative(root, context);

    return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
  });
}

const nextConfig: NextConfig = {
  transpilePackages: ["@world-cup-2026-predictor/api"],
  webpack(config, { webpack }) {
    config.plugins.push(
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
