// import { readFileSync } from 'node:fs';
import { join, isAbsolute } from 'path';
import type { JsPlugin } from '@farmfe/core';
import Generate from './generate.js';
import { debounce } from './utils.js';
import type { dirType } from './interfaces.js';

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
  dirs: string | (string | dirType)[];
  writeToDisk?: boolean;
}

const VIRTUAL_PATH = 'virtual_routes.tsx';

export default function farmPlugin(options: Options): JsPlugin {
  const {
    dirs,
    absVirtualPath,
    output,
    writeToDisk = false,
  } = resolveOptions(options);
  const routeCreator = new Generate({
    dirs,
    resolvedPath: absVirtualPath,
    output,
    writeToDisk,
  });
  let updateType: null | 'fileListChange' | 'fileMetaChange' = null;

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
        const content = await routeCreator.generateFileContent(updateType);
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
          if (
            !routeCreator.isWatchFile(filename) &&
            !routeCreator.isMetaFile(filename)
          ) {
            return;
          }
          if (event === 'add' || event === 'unlink') {
            updateType = 'fileListChange';
          } else if (event === 'change' && routeCreator.isMetaFile(filename)) {
            routeCreator.clearMetaCache(filename);
            updateType = 'fileMetaChange';
          }
          if (updateType) {
            await server.hmrEngine.hmrUpdate(absVirtualPath);
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
    resolveDirs = [{ dir: join(cwd, 'src/pages'), basePath: '' }];
  } else if (typeof dirs === 'string') {
    const dir = isAbsolute(dirs) ? dirs : join(cwd, dirs);
    resolveDirs = [{ dir, basePath: '' }];
  } else if (Array.isArray(dirs)) {
    resolveDirs = dirs.map((d) => {
      if (typeof d === 'string') {
        return { dir: isAbsolute(d) ? d : join(cwd, d), basePath: '' };
      }
      return {
        dir: isAbsolute(d.dir) ? d.dir : join(cwd, d.dir),
        basePath: d.basePath || '',
        pattern: d.pattern,
      };
    });
  }
  resolveDirs.push({
    dir: join(cwd, 'src/layouts'),
    basePath: '',
    isGlobal: true,
  });

  const output = join(cwd, 'node_modules/.farm/virtual_routes.tsx');
  const absVirtualPath = join(cwd, VIRTUAL_PATH);

  return { dirs: resolveDirs, output, absVirtualPath, ...rest };
}
