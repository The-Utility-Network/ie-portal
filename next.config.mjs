// next.config.js

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.module.rules.push({
        test: /\.(wav|mp3)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'static/sounds/',
            publicPath: '/static/sounds/',
          },
        },
      });
    }

    return config;
  },
  images: {
    domains: ['img.reservoir.tools'], // Add other domains as needed
    // You can also specify other image configurations here
  },
};

export default nextConfig;