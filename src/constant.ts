// UI框架类型
export const frameworkMap = {
  REACT: 'react',
  VUE: 'vue',
} as const;

export const frameworkList = Object.values(frameworkMap);

// 忽略的文件名
export const defaultIgnoredNames = [
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
