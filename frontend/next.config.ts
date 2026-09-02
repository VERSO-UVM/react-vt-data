/**
 * @author Fitz Koch
 * @since 2026-08-06
 *
 * @description
 *   NOTE: we might want to switch this to 'standalone' if we need server side rendering.
 *   SEE: https://docs.docker.com/guides/nextjs/
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: { ignoreBuildErrors: true }, // TODO: remove for eventual production.
};

export default nextConfig;

allowedDevOrigins: ['vtdatacollab.uvm.edu'];
