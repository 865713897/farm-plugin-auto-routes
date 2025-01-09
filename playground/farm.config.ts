import { defineConfig } from '@farmfe/core';
import farmPlugin from 'farm-plugin-auto-routes';

export default defineConfig({
  compilation: {
    input: {
      index: './index.html',
    },
    persistentCache: true,
    progress: false,
  },
  plugins: [
    ['@farmfe/plugin-react', { runtime: 'automatic' }],
    farmPlugin({
      dirs: ['src/pages', { dir: 'src/manage', basePath: '/manage' }],
      writeToDisk: true,
    }),
  ],
});
