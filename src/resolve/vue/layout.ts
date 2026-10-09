import { simpleLayoutId } from '../common.js';
import type { FileItem, RouteMeta } from '../../types/index.js';

export interface LayoutNode {
  id: string;
  dir: string;
  isGlobal: boolean;
  parentId: string | null;
  children: LayoutNode[];
}

export interface LayoutTree {
  // 全局Layout，不存在时为null
  root: LayoutNode | null;
  // 通过目录查找Layout
  byDir: Record<string, LayoutNode>;
  // 通过id查找Layout
  byId: Record<string, LayoutNode>;
  // 兼容
  layoutIdMap: Record<string, string>;
}

export function isGlobalLayoutFile(filePath: string): boolean {
  return /(?:^|\/)layouts\/index\.vue$/.test(filePath.replace(/\\/g, '/'));
}

export function isInnerLayoutFile(filePath: string): boolean {
  const name = filePath.split(/[\\/]/).pop() ?? '';

  return name === 'Layout.vue';
}

export function isLayoutFile(filePath: string): boolean {
  return isGlobalLayoutFile(filePath) || isInnerLayoutFile(filePath);
}

export function normalizeDir(dir: string): string {
  return dir.replace(/\\/g, '/').replace(/\/+$/, '');
}

export function getFileDir(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');

  return index < 0 ? '' : normalized.slice(0, index);
}

function getParentDir(dir: string): string {
  const normalized = normalizeDir(dir);
  const index = normalized.lastIndexOf('/');

  return index < 0 ? '' : normalized.slice(0, index);
}

/**
 * 查找最近的 Layout。
 *
 * dir 本身会参与查找：
 * - 普通页面从自身目录开始找；
 * - Layout 文件从父目录开始找，避免自己成为自己的父级。
 */
export function findNearestLayout(
  dir: string,
  tree: Pick<LayoutTree, 'byDir' | 'root'>,
): LayoutNode | null {
  let currentDir = normalizeDir(dir);

  while (currentDir) {
    const layout = tree.byDir[currentDir];

    if (layout) return layout;

    currentDir = getParentDir(currentDir);
  }

  return tree.root;
}

export function buildLayoutTree(fileList: FileItem[]): LayoutTree {
  const byDir: Record<string, LayoutNode> = {};
  const byId: Record<string, LayoutNode> = {};
  const layoutIdMap: Record<string, string> = {};

  // step 1: 确保收集到所有的Layout
  for (const { dir, files, isGlobal } of fileList) {
    for (const file of files) {
      if (!isLayoutFile(file)) continue;

      const global = Boolean(isGlobal || isGlobalLayoutFile(file));
      const fileDir = getFileDir(file);

      const layoutDir = isGlobal ? dir : fileDir;
      const id = simpleLayoutId(layoutDir, global);

      const node: LayoutNode = {
        id,
        dir: layoutDir,
        isGlobal: global,
        parentId: null,
        children: [],
      };

      byDir[layoutDir] = node;
      byId[id] = node;
      layoutIdMap[isGlobal ? 'global' : layoutDir] = id;
    }
  }

  const root = Object.values(byId).find((node) => node.isGlobal) ?? null;

  const tree = {
    root,
    byDir,
    byId,
    layoutIdMap,
  };

  // step 2: 根据目录层级建立layout父子关系
  for (const node of Object.values(byId)) {
    if (node.isGlobal) continue;

    const parentDir = getParentDir(node.dir);
    const parentNode = findNearestLayout(parentDir, tree);

    if (!parentNode || parentNode.id === node.id) continue;

    node.parentId = parentNode.id;
    parentNode.children.push(node);
  }

  return tree;
}

/**
 * 解析 Route 的父级
 *
 * routeMeta.parentId
 * - undefined: 自动寻找父级
 * - null: 显示指定为顶层
 * - string: 显示指定父 Route ID
 */
export function resolveRouteParent(
  file: string,
  isLayout: boolean,
  routeMeta: RouteMeta | undefined,
  tree: LayoutTree,
): string | null {
  if (routeMeta?.parentId !== undefined) return routeMeta.parentId;

  // 全局 Layout 是根结点
  if (isGlobalLayoutFile(file)) return null;

  const fileDir = getFileDir(file);
  const searchDir = isLayout ? getParentDir(fileDir) : fileDir;

  const parent = findNearestLayout(searchDir, tree);

  return parent ? parent.id : null;
}
