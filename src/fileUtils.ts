import { join } from 'path';
import fs from 'fs';
import {
  PAGE_FILE_REGEX,
  ROUTE_PATH_REGEX,
  LAYOUT_FILE_REGEX,
  LAYOUT_ID,
} from './constant.js';
import CacheManage from './cacheManage.js';
import type { fileListType, RouteType } from './interfaces.js';

// 解析路由文件
export function parseRoutes(
  fileList: fileListType[],
  resolvedPath: string,
  metaCache: CacheManage
): string {
  const routes: { [id: string]: RouteType } = {};
  const layoutMap = new Map<string, string>();
  // step 1: 预处理Layout文件
  // 约定**/layouts/index.(js|jsx|ts|tsx) | **/Layout.(js|jsx|ts|tsx) 为Layout文件
  for (const item of fileList) {
    const { dir, files, isGlobal } = item;
    for (const file of files) {
      if (LAYOUT_FILE_REGEX.test(file)) {
        const target = getDirTarget(dir, isGlobal);
        layoutMap.set(isGlobal ? 'global' : dir, target);
        break;
      }
    }
  }
  // step 2: 预处理路由文件
  for (const item of fileList) {
    const { dir, basePath, files } = item;
    const layoutId = layoutMap.get(dir) || layoutMap.get('global') || null; // 优先使用局部Layout
    for (const file of files) {
      const isLayout = isLayoutFile(file);
      const routePath = isLayout
        ? normalizePath('/' + basePath)
        : filePathToRoutePath(file, dir, basePath);
      const routeId = routePath.replace(/\//g, '-') || 'index';
      const relativePath = getRelativePath(resolvedPath, file);
      const metaPath = file.replace(PAGE_FILE_REGEX, '.meta.json');

      const { requireLayout = true, ...rest } = metaCache.getOrInsertWith(
        metaPath,
        () => {
          if (fs.existsSync(metaPath)) {
            try {
              const content = fs.readFileSync(metaPath, 'utf-8');
              return JSON.parse(content);
            } catch {
              return {};
            }
          }
          return {};
        }
      );
      let metaData = {
        id: routeId,
        path: normalizePath('/' + routePath.replace('$', ':')), // 适配动态路由
        Component: `__LAZY__React.lazy(() => import('${relativePath}'))__LAZY__`,
        ...rest,
      };

      if (isLayout) {
        metaData.id = layoutId;
        metaData.isLayout = true;
      } else if (requireLayout && layoutId && metaData.parentId === undefined) {
        metaData.parentId = layoutId;
      }
      routes[metaData.id] = metaData;
    }
  }
  // step 3: 构建父子关系并标记无效路由
  let toDelete: string[] = [];
  Object.values(routes).forEach((route: RouteType) => {
    const { id, parentId } = route;
    if (parentId) {
      const parentRoute = routes[parentId];
      if (parentRoute) {
        parentRoute.children = parentRoute.children || [];
        parentRoute.children.push(route);
        toDelete.push(id);
      }
    }
  });
  // step 4: 删除无效路由
  toDelete.forEach((id) => {
    delete routes[id];
  });
  // 检查并删除没有子路由的 Layout 路由
  Array.from(layoutMap.values()).forEach((layoutId) => {
    const { children = [] } = routes[layoutId];
    if (children.length === 0) {
      delete routes[layoutId];
    }
  });
  // step 5: 转换并返回路由列表
  const routesString = JSON.stringify(Object.values(routes), null, 2).replace(
    /"__LAZY__(.*?)__LAZY__"/g,
    '$1'
  );

  return routesString;
}

export function filePathToRoutePath(
  filePath: string,
  prefix: string,
  basePath: string
): string {
  return join('/', basePath, filePath.replace(prefix, ''))
    .replace(/\\/g, '/')
    .replace(ROUTE_PATH_REGEX, '')
    .slice(1)
    .replace(/([a-z])([A-Z])/g, '$1-$2') // 将驼峰式命名转换为连字符命名
    .toLowerCase();
}

export function getDirTarget(dir: string, isGlobal: boolean): string {
  return isGlobal ? LAYOUT_ID : `@@${dir.split('/').pop()}-layout`;
}

export function normalizePath(path: string) {
  return path.replace(/\/+/g, '/');
}

export function getRelativePath(from: string, to: string) {
  if (from === to) return '';

  const fromParts = from.split('/');
  const toParts = to.split('/');

  let i = 0;
  while (
    i < Math.min(fromParts.length, toParts.length) &&
    fromParts[i] === toParts[i]
  ) {
    i++;
  }

  // 计算相对路径
  const upSteps = fromParts.length - i - 1;
  const downSteps = toParts.slice(i);

  // 生成相对路径
  let relativePath = '../'.repeat(upSteps);
  if (upSteps === 0) {
    relativePath = './';
  }
  relativePath += downSteps.join('/');

  return relativePath;
}

export function isLayoutFile(file: string): boolean {
  return LAYOUT_FILE_REGEX.test(file);
}
