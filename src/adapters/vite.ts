import type { Plugin } from 'vite';
import RouterContext from '../core/context.js';
import { hasPlugin } from '../utils/index.js';
import { FrameworkEnum, virtualIdList } from '../constant.js';

const VIRTUAL_FILE_NAME = '\0vite_plugin_virtual_routes.ts';
export function vitePlugin(ctx: RouterContext): Plugin {
  return {
    name: 'farm-plugin-auto-routes',
    configResolved({ plugins }) {
      if (!ctx.isInit()) {
        if (hasPlugin(plugins, 'vite:react')) {
          ctx.setFramework(FrameworkEnum.REACT);
        } else if (hasPlugin(plugins, 'vite:vue')) {
          ctx.setFramework(FrameworkEnum.VUE);
        }
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
      server.watcher.on('all', (event, filename) => {
        if (event === 'add' || event === 'unlink') {
          if (ctx.isWatchFile(filename)) {
            updateViteFile(server);
          }
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
