import { FrameworkEnum } from '../constant.js';
import { normalizePath, getRelativePath } from '../utils/index.js';
import type { FileItem } from '../types/index.js';

interface IOpts {
  fileList: FileItem[];
  generatePath: string;
}

interface RouteMeta {
  id: string;
  path: string;
  parentId?: string;
  isLayout?: boolean;
  Component?: string;
  component?: string;
  children?: RouteMeta[];
}

function isLayoutFile(file: string): boolean {
  return (
    /(?:\/|^)layouts\/index\.(t|j)sx?$/.test(file) ||
    /\/Layout\.(t|j)sx?$/.test(file)
  );
}

function simpleLayoutId(input: string, isGlobal: boolean): string {
  const id = `@@${isGlobal ? 'global' : input.split('/').pop()}-layout`;
  return id;
}

function filePathToRoutePath(
  file: string,
  dir: string,
  basePath: string
): string {
  const relative = normalizePath(
    file.replace(dir, '').replace(/\.(jsx?|tsx?|vue)$/, '')
  );
  return normalizePath(`/${basePath}/${relative}`).replace(/\/index$/, '');
}

// 收集 Layout 文件对应的 ID
function collectLayoutIds(fileList: FileItem[]): Record<string, string> {
  const layoutIdMap: Record<string, string> = {};

  for (const { dir, files, isGlobal } of fileList) {
    for (const file of files) {
      if (isLayoutFile(file)) {
        layoutIdMap[isGlobal ? 'global' : dir] = simpleLayoutId(dir, isGlobal);
      }
    }
  }

  return layoutIdMap;
}

function buildRouteMap(
  framework: FrameworkEnum,
  fileList: FileItem[],
  generatePath: string,
  layoutIdMap: Record<string, string>
): Record<string, RouteMeta> {
  const routesMap: Record<string, RouteMeta> = {};

  for (const { dir, basePath, files } of fileList) {
    for (const file of files) {
      const isLayout = isLayoutFile(file);
      const layoutId = layoutIdMap[dir] || layoutIdMap['global'] || null;
      const routePath = isLayout
        ? normalizePath('/' + basePath)
        : filePathToRoutePath(file, dir, basePath);
      const routeId =
        routePath.slice(1).replace(/\//g, '-') || `${layoutId}-index`;
      const relativePath = getRelativePath(generatePath, file);

      const route: RouteMeta = {
        id: isLayout ? layoutId : routeId,
        path: normalizePath('/' + routePath.replace('$', ':')),
      };

      if (isLayout) {
        route.isLayout = true;
      } else {
        route.parentId = layoutId ?? '';
        if (layoutId && route.path.startsWith(normalizePath('/' + basePath))) {
          route.path = route.path.slice(basePath.length + 1) || '';
        }
      }

      if (framework === FrameworkEnum.REACT) {
        route.Component = `__LAZY__React.lazy(() => import('${relativePath}'))__LAZY__`;
      } else {
        route.component = `__LAZY__() => import('${relativePath}')__LAZY__`;
      }

      routesMap[route.id] = route;
    }
  }

  return routesMap;
}

function linkParentChildRoutes(routesMap: Record<string, RouteMeta>) {
  const childRouteIds: string[] = [];

  Object.values(routesMap).forEach((route) => {
    if (route.parentId && routesMap[route.parentId]) {
      const parent = routesMap[route.parentId];
      parent.children ??= [];
      parent.children.push(route);
      childRouteIds.push(route.id);
    }
  });

  // 删除嵌套后平级存在的子节点
  for (const id of childRouteIds) {
    delete routesMap[id];
  }
}

function pruneEmptyLayouts(
  routesMap: Record<string, RouteMeta>,
  layoutIdMap: Record<string, string>
) {
  for (const key in layoutIdMap) {
    const layoutId = layoutIdMap[key];
    const route = routesMap[layoutId];
    if (route?.isLayout && (!route.children || route.children.length === 0)) {
      if (key !== 'global') delete routesMap[layoutId];
    }
  }
}

export function getResolvedRoutes(
  framework: FrameworkEnum,
  opts: IOpts
): string {
  const { fileList, generatePath } = opts;

  const layoutIdMap = collectLayoutIds(fileList);
  const routesMap = buildRouteMap(
    framework,
    fileList,
    generatePath,
    layoutIdMap
  );
  linkParentChildRoutes(routesMap);
  pruneEmptyLayouts(routesMap, layoutIdMap);

  return JSON.stringify(Object.values(routesMap), null, 2).replace(
    /"__LAZY__(.*?)__LAZY__"/g,
    '$1'
  );
}
