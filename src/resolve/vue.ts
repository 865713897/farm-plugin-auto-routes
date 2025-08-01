import { getRouteMetaFromFiles } from '../core/routeMeta.js';
import { normalizePath, getRelativePath } from '../utils/index.js';
import {
  simpleLayoutId,
  filePathToRoutePath,
  linkParentChildRoutes,
  pruneEmptyLayouts,
} from './common.js';
import { FileItem, RouteMeta, IResolvedOpts } from '../types/index.js';

function generateTemplate(input: string) {
  return [
    '// @ts-nocheck',
    '// this file is generated by farm-plugin-auto-routes',
    '',
    `const routes = ${input};`,
    '',
    'export default routes;',
    '',
  ].join('\n');
}

function isPageFile(filePath: string): boolean {
  return /.vue$/.test(filePath);
}

function isGlobalLayoutFile(filePath: string): boolean {
  return /layouts\/index.vue$/.test(filePath);
}

function isInnerLayoutFile(filePath: string, dir: string): boolean {
  return filePath === `${dir}/Layout.vue`;
}

function collectLayoutIds(fileList: FileItem[]): Record<string, string> {
  const layoutIdMap: Record<string, string> = {};

  for (const { dir, files, isGlobal } of fileList) {
    for (const file of files) {
      if (isGlobalLayoutFile(file) || isInnerLayoutFile(file, dir)) {
        layoutIdMap[isGlobal ? 'global' : dir] = simpleLayoutId(dir, isGlobal);
      }
    }
  }

  return layoutIdMap;
}

async function buildRouteMap(
  fileList: FileItem[],
  generatePath: string,
  layoutIdMap: Record<string, string>
): Promise<Record<string, RouteMeta>> {
  const routesMap: Record<string, RouteMeta> = {};

  const filePaths = fileList.reduce((acc, { files }) => acc.concat(files), []);
  const routeMetas = await getRouteMetaFromFiles(filePaths);

  for (const { dir, basePath, files } of fileList) {
    for (const file of files) {
      const isLayout = isGlobalLayoutFile(file) || isInnerLayoutFile(file, dir);
      const layoutId = layoutIdMap[dir] || layoutIdMap['global'] || null;
      const routePath = isLayout
        ? normalizePath('/' + basePath)
        : filePathToRoutePath(file, dir, basePath);
      const isIndexFile =
        (routePath === basePath || routePath === '') && !isLayout;
      const routeId = isIndexFile
        ? layoutId
          ? `${layoutId}-index`
          : `${dir.split('/').pop()}-index`
        : routePath.slice(1).replace(/\//g, '-');
      const relativePath = getRelativePath(generatePath, file);

      let route: RouteMeta = {
        id: isLayout ? layoutId : routeId,
        path: normalizePath('/' + routePath.replace('$', ':')),
      };

      if (isLayout) {
        route.isLayout = true;
      } else {
        route.parentId = layoutId ?? null;
      }

      const routeMeta = routeMetas[file];
      route = { ...route, ...routeMeta };
      route.Component = `__LAZY__lazy(() => import('${relativePath}'))__LAZY__`;

      routesMap[route.id] = route;
    }
  }

  return routesMap;
}

async function getResolvedRoutes(opts: IResolvedOpts): Promise<string> {
  const { fileList, generatePath } = opts;

  const layoutIdMap = collectLayoutIds(fileList);
  const routesMap = await buildRouteMap(fileList, generatePath, layoutIdMap);
  linkParentChildRoutes(routesMap);
  pruneEmptyLayouts(routesMap, layoutIdMap);

  return JSON.stringify(Object.values(routesMap), null, 2).replace(
    /"__LAZY__(.*?)__LAZY__"/g,
    '$1'
  );
}

export function resolveVue() {
  return {
    suffix: 'vue',
    isPageFile,
    isGlobalLayoutFile,
    generateTemplate,
    getResolvedRoutes,
  };
}
