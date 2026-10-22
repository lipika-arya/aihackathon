import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // research JSON is read with fs at runtime; make sure it ships with the server bundle
  outputFileTracingIncludes: { "/**": ["./src/data/**/*"] },
};

export default nextConfig;
