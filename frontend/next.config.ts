import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode indicator badge sits bottom-left and collides with the
  // sidebar mascot's fixed position there.
  devIndicators: false,
};

export default nextConfig;
