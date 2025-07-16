export type dirType = {
  dir: string;
  basePath: string;
  pattern?: RegExp;
  isGlobal?: boolean;
};

// 组合的文件列表
export type FileItem = Omit<dirType, 'pattern'> & { files: string[] };

export interface IOptions {
  dirs?: string | (string | dirType)[];
  writeToDisk?: boolean;
}

// 插件入参
export interface IPluginOpts {}
