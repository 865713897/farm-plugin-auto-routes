import fs from 'fs';
import { join, isAbsolute } from 'path';

import Generate from './generate.js';
import { debounce, tryPaths } from './utils.js';
import {
  VIRTUAL_NAME,
  VITE_VIRTUAL_NAME,
  VITE_VIRTUAL_WRITE_NAME,
  VIRTUAL_ID,
  LAYOUT_FILE_REGEX,
} from './constant.js';

import type { JsPlugin } from '@farmfe/core';
import type { dirType, UploadType } from './interfaces.js';

/**
 * Interface representing the options for the auto-routes plugin.
 *
 * @property {string | string[] | { dir: string, basePath: string, pattern?: RegExp }[]} dirs - Specifies the directories to be used for generating routes.
 * - Can be a single directory as a string.
 * - Can be an array of directories as strings.
 * - Can be an array of objects with `dir` and `basePath` properties.
 *
 * Example usage:
 * ```typescript
 * const options: Options = {
 *   dirs: 'src/pages'
 * };
 *
 * const options: Options = {
 *   dirs: ['src/pages', 'src/some/pages']
 * };
 *
 * const options: Options = {
 *   dirs: [{ dir: 'src/pages', basePath: '' }, { dir: 'src/some/pages', basePath: '/some' }]
 * };
 * ```
 *
 * @property {boolean} writeToDisk - Specifies whether to write the generated routes to disk.
 */
interface Options {
  dirs?: string | (string | dirType)[];
  writeToDisk?: boolean;
}

export default function farmPlugin(options: Options = {}): JsPlugin {
  const {
    dirs,
    absVirtualPath,
    isVitePlugin,
    output,
    writeToDisk = false,
  } = resolveOptions(options);
  const routeCreator = new Generate({
    dirs,
    resolvedPath: absVirtualPath,
  });
  let updateType: UploadType = null;

  if (isVitePlugin) {
    return {
      name: 'farm-plugin-auto-routes',
      // @ts-ignore
      resolveId(id) {
        if (id === VIRTUAL_ID) {
          return VITE_VIRTUAL_NAME;
        }
      },
      // @ts-ignore
      async load(id) {
        if (id === VITE_VIRTUAL_NAME) {
          const content = await handleRouteUpdate(
            routeCreator,
            updateType,
            output,
            writeToDisk
          );
          updateType = null;
          return content;
        }
      },
      // @ts-ignore
      configureServer(server) {
        server.watcher.on(
          'all',
          debounce(async (event, filename) => {
            if (routeCreator.isWatchFile(filename)) {
              if (event === 'add' || event === 'unlink') {
                updateType = 'fileListChange';
              }
            } else if (routeCreator.isMetaFile(filename)) {
              if (event === 'change' || event === 'unlink') {
                updateType = 'fileMetaChange';
                routeCreator.clearMetaCache(filename);
              }
            }
            if (updateType) {
              updateViteFile(server);
            }
          }, 300)
        );
      },
    };
  }

  return {
    name: 'farm-plugin-auto-routes',
    config(config) {
      return config;
    },
    resolve: {
      filters: {
        sources: [VIRTUAL_ID, VIRTUAL_NAME],
        importers: [''],
      },
      async executor() {
        return {
          resolvedPath: VIRTUAL_NAME,
          external: false,
          sideEffects: false,
          meta: {},
        };
      },
    },
    load: {
      filters: {
        resolvedPaths: [VIRTUAL_NAME],
      },
      async executor() {
        const content = await handleRouteUpdate(
          routeCreator,
          updateType,
          output,
          writeToDisk
        );
        updateType = null;
        return {
          content,
          moduleType: 'tsx',
          sourceMap: null,
        };
      },
    },
    configureDevServer(server) {
      const fileWatcher = server.watcher.getInternalWatcher();
      fileWatcher.on(
        'all',
        debounce(async (event, filename) => {
          if (routeCreator.isWatchFile(filename)) {
            if (event === 'add' || event === 'unlink') {
              updateType = 'fileListChange';
            }
          } else if (routeCreator.isMetaFile(filename)) {
            if (event === 'change' || event === 'unlink') {
              updateType = 'fileMetaChange';
              routeCreator.clearMetaCache(filename);
            }
          }
          if (updateType) {
            await server.hmrEngine.hmrUpdate(VIRTUAL_NAME);
          }
        }, 300)
      );
    },
  };
}

function resolveOptions(opts: Options) {
  const { dirs, ...rest } = opts;
  const cwd = process.cwd();
  let resolveDirs: dirType[] = [];

  if (!dirs) {
    resolveDirs = [{ dir: resolvePath(cwd, 'src/pages'), basePath: '' }];
  } else if (typeof dirs === 'string') {
    resolveDirs = [{ dir: resolvePath(cwd, dirs), basePath: '' }];
  } else if (Array.isArray(dirs)) {
    resolveDirs = dirs.map((d) => {
      if (typeof d === 'string') {
        return { dir: resolvePath(cwd, d), basePath: '' };
      }
      return {
        dir: resolvePath(cwd, d.dir),
        basePath: d.basePath || '',
        pattern:
          typeof d.pattern === 'string' ? new RegExp(d.pattern) : d.pattern,
      };
    });
  }
  resolveDirs.push({
    dir: resolvePath(cwd, 'src/layouts'),
    basePath: '',
    isGlobal: true,
    pattern: LAYOUT_FILE_REGEX,
  });

  const isVitePlugin = isVite();
  const virtualPath = isVitePlugin ? VITE_VIRTUAL_WRITE_NAME : VIRTUAL_NAME;
  const output = resolvePath(cwd, `node_modules/${virtualPath}`);
  const absVirtualPath = resolvePath(cwd, virtualPath);

  return { dirs: resolveDirs, output, absVirtualPath, isVitePlugin, ...rest };
}

function isVite() {
  // 是否为vite环境
  const cwd = process.cwd();
  const paths = [join(cwd, 'vite.config.ts'), join(cwd, 'vite.config.js')];
  const configPath = tryPaths(paths);
  return !!configPath;
}

async function handleRouteUpdate(
  routeCreator: Generate,
  updateType: UploadType,
  output: string,
  writeToDisk: boolean
) {
  const content = await routeCreator.generateFileContent(updateType);
  if (writeToDisk) {
    writeFile(output, content);
  }
  return content;
}

function writeFile(path: string, content: string) {
  try {
    fs.writeFileSync(path, content);
  } catch (err) {
    console.error(`Failed to write file at ${path}:`, err);
  }
}

function updateViteFile(server: any) {
  try {
    const { moduleGraph } = server;
    const mods = moduleGraph.getModulesByFile(VITE_VIRTUAL_NAME);
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

function resolvePath(cwd: string, dir: string): string {
  // 统一使用 posix 格式路径
  const absolutePath = isAbsolute(dir)
    ? dir.split('\\').join('/')
    : join(cwd, dir);
  return absolutePath.split('\\').join('/'); // 转换为 posix 格式
}
