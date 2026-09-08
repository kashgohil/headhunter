import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "pdfkit"],
  outputFileTracingIncludes: {
    "/resumes/[id]/pdf": ["./node_modules/@fontsource/noto-sans-devanagari/files/*.woff"],
  },
};

export default nextConfig;
