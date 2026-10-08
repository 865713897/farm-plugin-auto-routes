export interface RouteDirectory {
  dir: string;
  basePath?: string;
  pattern?: string | RegExp;
  isGlobal?: boolean;
}

export interface FileItem {
  dir: string;
  files: string[];
  basePath?: string;
  isGlobal?: boolean;
}
