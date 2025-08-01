import { frameworkMap } from '../constant.js';

export type DirType = {
  dir: string;
  basePath?: string;
  pattern?: string | RegExp;
  isGlobal?: boolean;
};

// 组合的文件列表
export type FileItem = Omit<DirType, 'pattern'> & { files: string[] };

export type Framework = (typeof frameworkMap)[keyof typeof frameworkMap];

export interface IOptions {
  dirs?: string | (string | DirType)[];
  writeToDisk?: boolean;
  framework?: Framework;
}

export interface RouteMeta {
  id: string;
  path: string;
  parentId?: string;
  isLayout?: boolean;
  Component?: string;
  component?: string;
  children?: RouteMeta[];
}

export type IResolvedOpts = {
  fileList: FileItem[];
  generatePath: string;
};

export type ResolverType = {
  suffix: string;
  isPageFile: (filePath: string) => boolean;
  isGlobalLayoutFile: (filePath: string) => boolean;
  generateTemplate: (input: string) => string;
  getResolvedRoutes: (opts: IResolvedOpts) => Promise<string>;
};
