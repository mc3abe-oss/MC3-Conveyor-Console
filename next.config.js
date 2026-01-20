/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable typed routes (moved from experimental in Next.js 15.5.9)
  typedRoutes: true,
  // Use app directory (Next.js 13+)
  reactStrictMode: true,

  async redirects() {
    return [
      // System pages
      { source: '/console/admin/users', destination: '/console/admin/system/users', permanent: true },
      { source: '/console/admin/orphaned-applications', destination: '/console/admin/system/orphaned-applications', permanent: true },

      // Catalog pages
      { source: '/console/admin/nord', destination: '/console/admin/catalog/gearmotors', permanent: true },
      { source: '/console/admin/belts', destination: '/console/admin/catalog/belts', permanent: true },
      { source: '/console/admin/pulley-library', destination: '/console/admin/catalog/pulley-library', permanent: true },
      { source: '/console/admin/v-guides', destination: '/console/admin/catalog/v-guides', permanent: true },
      { source: '/console/admin/cleats', destination: '/console/admin/catalog/cleats', permanent: true },
      { source: '/console/admin/caster-models', destination: '/console/admin/catalog/caster-models', permanent: true },
      { source: '/console/admin/leg-models', destination: '/console/admin/catalog/leg-models', permanent: true },
      { source: '/console/admin/power-feed', destination: '/console/admin/catalog/power-feed', permanent: true },
      { source: '/console/admin/controls-package', destination: '/console/admin/catalog/controls-package', permanent: true },
      { source: '/console/admin/sensor-models', destination: '/console/admin/catalog/sensor-models', permanent: true },
      { source: '/console/admin/documentation-package', destination: '/console/admin/catalog/documentation-package', permanent: true },
      { source: '/console/admin/powder-colors', destination: '/console/admin/catalog/powder-colors', permanent: true },
      { source: '/console/admin/environment-factors', destination: '/console/admin/catalog/environment-factors', permanent: true },
      { source: '/console/admin/process-types', destination: '/console/admin/catalog/process-types', permanent: true },
    ];
  },
};

module.exports = nextConfig;
