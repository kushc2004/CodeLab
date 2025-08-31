/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure webpack to handle Pyodide
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Browser-side config for Pyodide
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        crypto: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
