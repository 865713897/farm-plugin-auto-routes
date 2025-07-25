import type { Plugin } from 'vite';
import RouterContext from '../core/context.js';
import { handleFileChange } from '../utils/handleFileChange.js';
import { debounce } from '../utils/debounce.js';
import { hasPlugin, unifiedUnixPathStyle } from '../utils/index.js';
import { FrameworkEnum, virtualIdList } from '../constant.js';
import { clearRouteMetaCache } from '../core/routeMeta.js';

const VIRTUAL_FILE_NAME = '\0vite_plugin_virtual_routes.ts';
export function vitePlugin(ctx: RouterContext): Plugin {
  const addFiles = new Set<string>();
  const changeFiles = new Set<string>();
  const removeFiles = new Set<string>();

  return {
    name: 'farm-plugin-auto-routes',
    async configResolved({ plugins }) {
      if (!ctx.isInit()) {
        if (hasPlugin(plugins, 'vite:react')) {
          ctx.setFramework(FrameworkEnum.REACT);
        } else if (hasPlugin(plugins, 'vite:vue')) {
          ctx.setFramework(FrameworkEnum.VUE);
        }
        await ctx.getInitialFileList();
      }
    },
    resolveId(id: string) {
      if (virtualIdList.includes(id)) {
        return VIRTUAL_FILE_NAME;
      }
    },
    async load(id: string) {
      if (id === VIRTUAL_FILE_NAME) {
        const content = await ctx.generateFileContent();

        return content;
      }
    },
    configureServer(server) {
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
          updateViteFile(server); // 触发热更新
        }
      }, 300);

      server.watcher.on('all', async (event, filename) => {
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

function updateViteFile(server: any) {
  try {
    const { moduleGraph } = server;
    const mods = moduleGraph.getModulesByFile(VIRTUAL_FILE_NAME);
    if (mods) {
      for (const mod of mods) {
        const seen = new Set();
        moduleGraph.invalidateModule(mod, seen, Date.now(), true);
      }
    }
    server.ws.send({ type: 'full-reload' });
  } catch (err) {
    console.error('Failed to update Vite file:', err);
  }
}
