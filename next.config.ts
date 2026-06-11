import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse and pdfjs-dist use native Node.js features that break when
  // bundled by webpack — run them un-bundled on the server side.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@react-pdf/renderer"],
};

export default nextConfig;
