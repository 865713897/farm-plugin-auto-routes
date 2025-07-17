import type { JsPlugin } from '@farmfe/core';
import { hasPlugin, unifiedUnixPathStyle } from '../utils/index.js';
import { FrameworkEnum, virtualIdList } from '../constant.js';
import RouteContext from '../core/context.js';
import { clearRouteMetaCache } from '../core/routeMeta.js';

const VIRTUAL_FILE_NAME = 'farmfe_plugin_virtual_routes.ts';

export function farmPlugin(ctx: RouteContext): JsPlugin {
  return {
    name: 'farm-plugin-auto-routes',
    async configResolved({ plugins, vitePlugins }) {
      if (!ctx.isInit()) {
        if (hasPlugin(plugins, '@farmfe/plugin-react')) {
          ctx.setFramework(FrameworkEnum.REACT);
        } else if (hasPlugin(vitePlugins, 'vite:vue')) {
          ctx.setFramework(FrameworkEnum.VUE);
        }
        await ctx.getInitialFileList();
      }
    },
    resolve: {
      filters: {
        sources: [...virtualIdList, VIRTUAL_FILE_NAME],
        importers: [''],
      },
      executor() {
        return {
          resolvedPath: VIRTUAL_FILE_NAME,
          external: false,
          sideEffects: false,
          meta: {},
        };
      },
    },
    load: {
      filters: {
        resolvedPaths: [VIRTUAL_FILE_NAME],
      },
      async executor() {
        const content = await ctx.generateFileContent();

        return {
          content,
          moduleType: 'ts',
          sourceMap: null,
        };
      },
    },
    configureDevServer(server) {
      const fileWatcher = server.watcher.getInternalWatcher();

      fileWatcher.on('all', async (event, filename) => {
        const unixFilename = unifiedUnixPathStyle(filename);

        if (!ctx.isWatchFile(unixFilename)) return;

        const handlers: Record<string, () => void> = {
          add: () => ctx.addFile(unixFilename),
          unlink: () => ctx.removeFile(unixFilename),
          change: () => clearRouteMetaCache(unixFilename),
        };

        const handler = handlers[event];
        if (handler) {
          handler();
          await server.hmrEngine.hmrUpdate(VIRTUAL_FILE_NAME); // 触发热更新
        }
      });
    },
  };
}
