export type DirType = {
  dir: string;
  basePath: string;
  pattern?: RegExp;
  isGlobal?: boolean;
};

// 组合的文件列表
export type FileItem = Omit<DirType, 'pattern'> & { files: string[] };

export interface IOptions {
  dirs?: string | (string | DirType)[];
  writeToDisk?: boolean;
}

export type ResolverType = {
  suffix: string;
  isPageFile: (filePath: string) => boolean;
  isLayoutFile: (filePath: string) => boolean;
  generateTemplate: (input: string) => string;
};
