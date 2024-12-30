// import { readFileSync } from 'node:fs';
import path from 'path';
import type { JsPlugin, PluginResolveHookResult } from '@farmfe/core';
import RouteContext from './routeContext.js';

interface Options {
  /* Your options here */
}

const VIRTUAL_PATH = 'src/.farm/virtual_routes.tsx';

export default function farmPlugin(options: Options): JsPlugin {
  const fileUsedPath = path.join(process.cwd(), 'src/.farm');
  const absPath = path.join(
    process.cwd(),
    'node_modules/.farm/virtual_routes.tsx'
  );
  const absVirtualPath = path.join(process.cwd(), VIRTUAL_PATH);
  const routeCreator = new RouteContext(fileUsedPath);

  return {
    name: 'farm-plugin-auto-routes',
    config(config) {
      console.log('options:', options);
      return config;
    },
    resolve: {
      filters: {
        sources: ['virtual:routes'],
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
        console.log('load: =======');
        return {
          content,
          moduleType: 'tsx',
          sourceMap: null,
        };
      },
    },
    pluginCacheLoaded: {
      async executor(bytes) {
        const str = Buffer.from(bytes).toString();
        console.log('pluginCacheLoaded:', str);
        // cachedData = JSON.parse(str);
      },
    },
    configureDevServer(server) {
      const fileWatcher = server.watcher.getInternalWatcher();
      fileWatcher.on('all', async (event, filename) => {
        if (event === 'add' || event === 'unlink') {
          const result = await server.getCompiler().update([absPath]);
          console.log(result, 'result');

          // 客户端刷新页面
          server.ws.send({
            type: 'full-reload',
          });
        }
      });
    },
  };
}
