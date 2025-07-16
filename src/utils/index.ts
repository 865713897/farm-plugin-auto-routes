import fs from 'fs';
import { join } from 'path';

// 判断路径是否存在
export function tryPaths(paths: string[]) {
  for (const path of paths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return null;
}

// 判断是否为Vite环境
export function isVite() {
  const cwd = process.cwd();
  const viteConfigPaths = [
    join(cwd, 'vite.config.ts'),
    join(cwd, 'vite.config.js'),
    join(cwd, 'vite.config.mjs'),
  ];

  const configPath = tryPaths(viteConfigPaths);

  return !!configPath;
}

// 获取target id
export function getTargetId(dir: string) {
  const target = dir.split('/').pop();
  const targetId =
    target === 'layouts' ? '@@global-layout' : `@@${target}-layout`;
  return targetId;
}

// 简易hash函数
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1e8; // 乘 31 累积并取模
  }
  return hash.toString(36); // 转为 36 进制字符串
}

// 导出一个名为 normalizePath 的函数，该函数用于规范化路径字符串
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

export function hasPlugin(plugins: readonly any[], pluginName: string) {
  return plugins.some((plugin) => {
    if (typeof plugin === 'string') return plugin.includes(pluginName);
    if (Array.isArray(plugin)) return plugin[0].includes(pluginName);
    if (typeof plugin === 'object') return plugin?.name?.includes(pluginName);
    return false;
  });
}
