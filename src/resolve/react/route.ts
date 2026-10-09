import { filePathToRoutePath } from '../common.js';
import { generateRouteComponent } from './component.js';
import { getRouteMetaFromFiles } from '../../core/routeMeta.js';
import {
  getFileDir,
  isGlobalLayoutFile,
  isLayoutFile,
  normalizeDir,
  resolveRouteParent,
} from './layout.js';
import { getRelativePath, normalizePath } from '../../utils/index.js';
import type { FileItem, ReactOptions, ReactRoute } from '../../types/index.js';
import type { LayoutTree } from './layout.js';

function getRouteId(routePath: string, isIndexFile: boolean, parentId: string | null, dir: string) {
  if (isIndexFile) {
    return parentId ? `${parentId}-index` : `${dir.split('/').pop()}-index`;
  }

  return routePath.slice(1).replace(/\//g, '-');
}

export async function buildRouteMap(
  fileList: FileItem[],
  generatePath: string,
  layoutTree: LayoutTree,
  reactOptions?: ReactOptions,
): Promise<Record<string, ReactRoute>> {
  const routesMap: Record<string, ReactRoute> = {};

  const filePaths = fileList.reduce((acc, { files }) => acc.concat(files), [] as string[]);

  const metaData = await getRouteMetaFromFiles(filePaths);

  for (const { dir, basePath, files, isGlobal } of fileList) {
    for (const file of files) {
      const isLayout = isLayoutFile(file);
      const isGlobalLayout = isGlobalLayoutFile(file);
      const fileDir = getFileDir(file);

      // 全局 Layout 使用FileItem的配置目录，局部 Layout 使用实际文件目录
      const layoutDir = normalizeDir(isGlobal || isGlobalLayout ? dir : fileDir);

      const routeMeta = metaData[file];

      const parentId = resolveRouteParent(file, isLayout, routeMeta, layoutTree);

      const routePath = isLayout
        ? normalizePath('/' + basePath)
        : filePathToRoutePath(file, dir, basePath);

      const isIndexFile = (routePath === basePath || routePath === '') && !isLayout;

      const layoutId =
        layoutTree.byDir[layoutDir]?.id ??
        layoutTree.layoutIdMap[isGlobal ? 'global' : layoutDir] ??
        layoutTree.root?.id ??
        null;

      const routeId = isLayout ? layoutId : getRouteId(routePath, isIndexFile, parentId, dir);

      const relativePath = getRelativePath(generatePath, file);

      const route: ReactRoute = {
        id: routeId,
        path: normalizePath('/' + routePath.replace('$', ':')),
      };

      if (isLayout) {
        route.isLayout = true;
      }

      Object.assign(route, routeMeta);
      route.parentId = parentId;

      const component = generateRouteComponent(relativePath, reactOptions);

      Object.assign(route, component);

      routesMap[route.id] = route;
    }
  }

  return routesMap;
}
