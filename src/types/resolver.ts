import { FileItem } from './file.js';

export interface ResolvedRouteOptions {
  fileList: FileItem[];
  generatePath: string;
}

export interface RouteResolver {
  suffix: string;

  isPageFile(filePath: string): boolean;

  isGlobalLayoutFile(filePath: string): boolean;

  generateTemplate(input: string): string;

  getResolvedRoutes(options: ResolvedRouteOptions): Promise<string>;
}
