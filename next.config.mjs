/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Exclude packages from being bundled server-side to avoid test files
    serverComponentsExternalPackages: ['pino', 'thread-stream', 'pino-pretty'],
  },
  // Make webpack ignore problematic test files
  webpack: (config, { isServer }) => {
    // Add alias to prevent test dependencies from being resolved
    config.resolve.alias = {
      ...config.resolve.alias,
      'tap': false,
      'tape': false,
      'desm': false,
      'fastbench': false,
      'pino-elasticsearch': false,
      'why-is-node-running': false,
    };

    // Exclude test files from bundling
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    config.module.rules.push({
      test: /node_modules[/\\]thread-stream[/\\](test|bench\.js)/,
      use: 'null-loader',
    });

    config.module.rules.push({
      test: /\.(test|spec)\.(js|mjs|ts|tsx)$/,
      use: 'null-loader',
    });

    // Fix for @walletconnect and privy dependencies on client side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
      };
    }

    return config;
  },
}

export default nextConfig
