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
import { join } from 'path';

import RouteContext from './core/context.js';
import { farmPlugin, vitePlugin } from './adapters/index.js';
import { isVite, unifiedUnixPathStyle } from './utils/index.js';

import { IOptions, DirType } from './types/index.js';

export default function AutoRoutesPlugin(options?: IOptions) {
  const { writeToDisk } = options || {};
  const { dirs, isVitePlugin, generatePath, writePath } =
    resolveOptions(options);
  let ctx = new RouteContext({ dirs, generatePath, writePath, writeToDisk });
  if (isVitePlugin) {
    return vitePlugin(ctx);
  }
  return farmPlugin(ctx);
}

export function resolveOptions(opts: IOptions = {}) {
  const { dirs } = opts;
  const cwd = process.cwd();
  let resolveDirs: DirType[] = [];

  if (!dirs) {
    resolveDirs = [
      { dir: unifiedUnixPathStyle(join(cwd, 'src/pages')), basePath: '' },
    ];
  } else if (typeof dirs === 'string') {
    resolveDirs = [
      { dir: unifiedUnixPathStyle(join(cwd, dirs)), basePath: '' },
    ];
  } else if (Array.isArray(dirs)) {
    resolveDirs = dirs.map((d) => {
      if (typeof d === 'string') {
        return { dir: unifiedUnixPathStyle(join(cwd, d)), basePath: '' };
      }
      return {
        dir: unifiedUnixPathStyle(join(cwd, d.dir)),
        basePath: d.basePath || '',
        pattern:
          typeof d.pattern === 'string' ? new RegExp(d.pattern) : d.pattern,
      };
    });
  }
  // 增加全局路由路径
  resolveDirs.push({
    dir: unifiedUnixPathStyle(join(cwd, 'src/layouts')),
    basePath: '',
    isGlobal: true,
  });

  const isVitePlugin = isVite();
  let virtualName = isVitePlugin
    ? 'vite_plugin_virtual_routes.ts'
    : 'farmfe_plugin_virtual_routes.ts';
  const writePath = unifiedUnixPathStyle(
    join(cwd, 'node_modules', virtualName)
  );
  const generatePath = unifiedUnixPathStyle(join(cwd, virtualName));

  return {
    dirs: resolveDirs,
    writePath,
    generatePath,
    isVitePlugin,
  };
}
