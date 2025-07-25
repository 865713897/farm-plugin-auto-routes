import type { JsPlugin } from '@farmfe/core';
import { hasPlugin, unifiedUnixPathStyle } from '../utils/index.js';
import { handleFileChange } from '../utils/handleFileChange.js';
import { debounce } from '../utils/debounce.js';
import { FrameworkEnum, virtualIdList } from '../constant.js';
import RouteContext from '../core/context.js';
import { clearRouteMetaCache } from '../core/routeMeta.js';

const VIRTUAL_FILE_NAME = 'farmfe_plugin_virtual_routes.ts';

export function farmPlugin(ctx: RouteContext): JsPlugin {
  const addFiles = new Set<string>();
  const changeFiles = new Set<string>();
  const removeFiles = new Set<string>();

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

      const debounceFlush = debounce(async () => {
        let shouldUpdate = false;
        for (const file of Array.from(addFiles)) {
          ctx.addFile(file);
          shouldUpdate = true;
        }
        for (const file of Array.from(changeFiles)) {
          if (await handleFileChange(file)) {
            shouldUpdate = true;
          }
        }
        for (const file of Array.from(removeFiles)) {
          ctx.removeFile(file);
          clearRouteMetaCache(file);
          shouldUpdate = true;
        }

        addFiles.clear();
        changeFiles.clear();
        removeFiles.clear();
        if (shouldUpdate) {
          await server.hmrEngine.hmrUpdate(VIRTUAL_FILE_NAME); // 通知客户端更新
        }
      }, 300);

      fileWatcher.on('all', async (event, filename) => {
        const unixFilename = unifiedUnixPathStyle(filename);
        if (!ctx.isWatchFile(unixFilename)) return;

        const handlers: Record<string, () => void> = {
          add: () => addFiles.add(unixFilename),
          change: () => changeFiles.add(unixFilename),
          unlink: () => removeFiles.add(unixFilename),
        };

        const handler = handlers[event];
        if (handler) {
          handler();
          debounceFlush();
        }
      });
    },
  };
}
