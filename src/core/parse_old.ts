import { join } from 'path';

import { normalizePath, simpleHash, getRelativePath } from '../utils/index.js';
import {
  FrameworkEnum,
  LAYOUT_FILE_REGEX,
  ROUTE_PATH_REGEX,
} from '../constant.js';
import type { FileItem } from '../types/index.js';

interface IOpts {
  fileList: FileItem[];
  generatePath: string;
}

// 获取处理后的路由
export function getResolvedRoutes(framework: FrameworkEnum, opts: IOpts) {
  const { fileList, generatePath } = opts;
  // let resolveFileList = [];
  const routesMap: any = {};
  const layoutIdMap: Record<string, string> = {};
  // step 1: 预处理Layout文件
  // 约定**/layouts/index.(js|jsx|ts|tsx|vue) | **/Layout.(js|jsx|ts|tsx|vue) 为Layout文件
  for (const item of fileList) {
    const { dir, files, isGlobal } = item;
    for (const file of files) {
      if (isLayoutFile(file)) {
        layoutIdMap[isGlobal ? 'global' : dir] = simpleHash(dir); // 生成layoutId
      }
    }
  }
  // step 2: 预处理路由文件
  for (const item of fileList) {
    const { dir, files, basePath } = item;
    for (const file of files) {
      const isLayout = isLayoutFile(file);
      const layoutId = layoutIdMap[dir] || layoutIdMap['global'] || null;
      const routePath = isLayout
        ? normalizePath('/' + basePath)
        : filePathToRoutePath(file, dir, basePath);
      const routeId = routePath.replace(/\//g, '-') || 'index';
      const relativePath = getRelativePath(generatePath, file);
      let metaData: any = {
        id: routeId,
        path: normalizePath('/' + routePath.replace('$', ':')), // 适配动态路由
      };
      if (framework === FrameworkEnum.REACT) {
        metaData.Component = `__LAZY__React.lazy(() => import('${relativePath}'))__LAZY__`;
      } else if (framework === FrameworkEnum.VUE) {
        metaData.component = `__LAZY__() => import('${relativePath}')__LAZY__`;
      }
      if (isLayout) {
        metaData.id = layoutId;
        metaData.isLayout = true;
      } else {
        metaData.parentId = layoutId;
        metaData.path = metaData.path.replace(basePath, ''); // 去除父路由路径
      }

      routesMap[metaData.id] = metaData;
    }
  }

  // step 3: 构建父子关系并标记无效路由
  let toDelete: string[] = [];
  Object.values(routesMap).forEach((route: any) => {
    const { id, parentId } = route;
    if (parentId) {
      const parentRoute = routesMap[parentId];
      if (parentRoute) {
        parentRoute.children = parentRoute.children || [];
        parentRoute.children.push(route);
        toDelete.push(id);
      }
    }
  });

  // step 4: 删除无效路由
  toDelete.forEach((id) => {
    delete routesMap[id];
  });
  for (const key in layoutIdMap) {
    // 检查并删除没有子路由的 Layout 路由
    console.log(key, 'key');
    const layoutId = layoutIdMap[key];
    const { children } = routesMap[layoutId];
    if (!children || children.length === 0) {
      delete routesMap[layoutId];
    }
  }

  const routesString = JSON.stringify(
    Object.values(routesMap),
    null,
    2
  ).replace(/"__LAZY__(.*?)__LAZY__"/g, '$1');

  console.log('routesString', routesString);
}

function isLayoutFile(fileName: string) {
  return LAYOUT_FILE_REGEX.test(fileName);
}

function filePathToRoutePath(
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

export function resolveUtils(framework: FrameworkEnum) {
  switch (framework) {
    case FrameworkEnum.REACT:
      return {
        suffix: 'tsx|ts|jsx|js',
      };
    case FrameworkEnum.VUE:
      return {
        suffix: 'vue',
      };
  }
}
