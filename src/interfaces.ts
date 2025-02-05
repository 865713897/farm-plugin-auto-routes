export type dirType = {
  dir: string;
  basePath: string;
  pattern?: RegExp;
  isGlobal?: boolean;
};

export type fileListType = Omit<dirType, 'pattern'> & { files: string[] };

export type UploadType = null | 'fileListChange' | 'fileMetaChange';

export type RouteType = {
  id: string;
  path: string;
  Component: string;
  parentId?: string;
  isLayout?: boolean;
  children?: RouteType[];
  [key: string]: any;
};
