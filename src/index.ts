// import { readFileSync } from 'node:fs';
import path from 'path';
import fs from 'fs';
import type { JsPlugin, PluginResolveHookResult } from '@farmfe/core';
import RouteContext from './routeContext.js';

interface Options {
  /* Your options here */
}

const VIRTUAL_PATH = 'src/.farm/virtual_routes.tsx';

export default function farmPlugin(options: Options): JsPlugin {
  const cwd = process.cwd();
  const fileUsedPath = path.join(cwd, 'src/.farm');
  const absVirtualPath = path.join(cwd, VIRTUAL_PATH);
  const routeCreator = new RouteContext(fileUsedPath);

  return {
    name: 'farm-plugin-auto-routes',
    config(config) {
      console.log('options:', options);
      return config;
    },
    resolve: {
      filters: {
        sources: ['virtual:routes', VIRTUAL_PATH],
        importers: [''],
      },
      async executor() {
        return {
          resolvedPath: absVirtualPath,
          external: false,
          sideEffects: false,
          meta: {},
        };
      },
    },
    load: {
      filters: {
        resolvedPaths: [absVirtualPath],
      },
      async executor() {
        const content = routeCreator.getContent();
        return {
          content,
          moduleType: 'tsx',
          sourceMap: null,
        };
      },
    },
    configureDevServer(server) {
      const fileWatcher = server.watcher.getInternalWatcher();
      fileWatcher.on('all', async (event, filename) => {
        if (event === 'add' || event === 'unlink') {
          server.hmrEngine.hmrUpdate(absVirtualPath);
        }
      });
    },
  };
}
