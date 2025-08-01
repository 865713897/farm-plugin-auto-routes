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
 * @property {react | vue} framework - Specifies the framework to be used for generating routes.
 */
import { join } from 'path';

import RouteContext from './core/context.js';
import { farmPlugin, vitePlugin } from './adapters/index.js';
import { isVite, unifiedUnixPathStyle, isEnumValue } from './utils/index.js';
import { detectFrameworkFromPackageJson } from './utils/detectFramework.js';
import { frameworkMap, frameworkList } from './constant.js';

import { IOptions, DirType } from './types/index.js';

export default function AutoRoutesPlugin(options?: IOptions) {
  const { writeToDisk, framework: outFramework } = options || {};
  const { dirs, isVitePlugin, generatePath, writePath, cwd } =
    resolveOptions(options);
  const framework = outFramework || detectFrameworkFromPackageJson(cwd);
  if (!isEnumValue(frameworkMap, framework)) {
    throw new Error(
      framework === 'unknown'
        ? '[farm-plugin-auto-routes] Cannot detect framework from package.json, please set framework manually'
        : `[farm-plugin-auto-routes] framework must be one of ${frameworkList.join(
            '|'
          )}, but got ${framework}`
    );
  }
  const ctx = new RouteContext({
    dirs,
    generatePath,
    writePath,
    writeToDisk,
    framework,
  });
  if (isVitePlugin) {
    return vitePlugin(ctx);
  }
  return farmPlugin(ctx);
}

function normalizeDirEntry(entry: string | DirType, cwd: string): DirType {
  if (typeof entry === 'string') {
    return {
      dir: unifiedUnixPathStyle(join(cwd, entry)),
      basePath: '',
    };
  }
  return {
    dir: unifiedUnixPathStyle(join(cwd, entry.dir)),
    basePath: entry.basePath || '',
    pattern:
      typeof entry.pattern === 'string'
        ? new RegExp(entry.pattern)
        : entry.pattern,
  };
}

export function resolveOptions(opts: IOptions = {}) {
  const { dirs } = opts;
  const cwd = process.cwd();
  let resolveDirs: DirType[] = [];
  resolveDirs = (
    Array.isArray(dirs)
      ? dirs
      : typeof dirs === 'string'
      ? [dirs]
      : ['src/pages']
  ).map((entry) => normalizeDirEntry(entry, cwd));
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
    cwd,
    dirs: resolveDirs,
    writePath,
    generatePath,
    isVitePlugin,
  };
}
