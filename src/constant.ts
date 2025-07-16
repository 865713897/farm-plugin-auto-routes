// UI框架类型
export enum FrameworkEnum {
  REACT = 'react',
  VUE = 'vue',
}

// 是否为layout文件
export const LAYOUT_FILE_REGEX = /(?:layouts\/index|Layout)\.(tsx?|jsx?|vue)$/i;

export const ROUTE_PATH_REGEX = /(\/index)?.(jsx?|tsx?|vue)$/;

// 忽略的文件名
export const DEFAULT_IGNORED = [
  'component',
  'service',
  'util',
  'asset',
  'style',
  'type',
  'hook',
  'interface',
  'api',
  'constant',
  'model',
  'const',
];

export const virtualIdList = ['virtual:routes', 'virtual:routes-vue'];
