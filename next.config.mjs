/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configure turbopack to handle node_modules properly
  turbopack: {
    resolveExtensions: [
      '.mdx',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.mjs',
      '.json',
    ],
  },
  experimental: {
    turbo: {
      rules: {
        '*.test.{js,ts,tsx,mjs}': {
          loaders: [],
          as: '*.js',
        },
        '*/test/**': {
          loaders: [],
          as: '*.js',
        },
      },
      resolveAlias: {
        // Alias problematic test dependencies to empty modules
        'tap': false,
        'tape': false,
        'desm': false,
        'fastbench': false,
        'pino-elasticsearch': false,
        'why-is-node-running': false,
      },
    },
  },
  webpack: (config, { isServer }) => {
    // Exclude problematic test files from bundling
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    config.module.rules.push({
      test: /node_modules[/\\]thread-stream[/\\]test/,
      use: 'null-loader',
    });

    config.module.rules.push({
      test: /\.(test|spec)\.(js|mjs|ts|tsx)$/,
      use: 'null-loader',
    });

    // Exclude test directories entirely
    config.module.rules.push({
      test: /[/\\]test[/\\]/,
      exclude: /node_modules[/\\](?!thread-stream)/,
      use: 'null-loader',
    });

    // Fix for @walletconnect and privy dependencies
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
