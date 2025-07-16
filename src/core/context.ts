import fg from 'fast-glob';
import fs from 'fs';

import { DEFAULT_IGNORED, FrameworkEnum } from '../constant.js';
import { getResolvedRoutes } from './parse.js';
import { getResolver } from '../resolve/index.js';
import { dirType, FileItem } from '../types/index.js';

interface IOpts {
  dirs: dirType[];
  generatePath: string;
  writePath: string;
  writeToDisk?: boolean;
}

export default class Context {
  private dirs: dirType[];
  private ignore: string[];
  private generatePath: string;
  private framework: FrameworkEnum;
  private writeToDisk: boolean;
  private writePath: string;
  resolver: {
    suffix: string;
    generateTemplate: (input: string) => string;
  };

  constructor(opts: IOpts) {
    const { dirs, generatePath, writePath, writeToDisk } = opts;
    this.dirs = dirs;
    this.generatePath = generatePath;
    this.writePath = writePath;
    this.writeToDisk = writeToDisk;
    this.ignore = DEFAULT_IGNORED.reduce((acc, cur) => {
      acc.push(...[`**/${cur}?(s).*`, `**/${cur}?(s)/**`]);
      return acc;
    }, []);
  }

  async getFileList(dirs: dirType[]): Promise<FileItem[]> {
    let filesList: FileItem[] = [];
    const { suffix } = this.resolver;
    for (const { dir, pattern, basePath, isGlobal = false } of dirs) {
      let list = await fg(`**/*.@(${suffix})`, {
        cwd: dir,
        absolute: true,
        onlyFiles: true,
        ignore: this.ignore,
      });
      if (pattern && pattern instanceof RegExp) {
        list = list.filter((file) => pattern.test(file));
      }
      filesList.push({ dir, files: list, basePath, isGlobal });
    }

    return filesList;
  }

  async generateFileContent() {
    if (!this.isInit()) {
      throw new Error('framework not set');
    }

    const { generateTemplate } = this.resolver;

    const fileList = await this.getFileList(this.dirs);

    const routesString = getResolvedRoutes(this.framework, {
      fileList,
      generatePath: this.generatePath,
    });
    const template = generateTemplate(routesString);

    if (this.writeToDisk) {
      this.writeFile(this.writePath, template);
    }

    return template;
  }

  setFramework(framework: FrameworkEnum) {
    this.framework = framework;
    this.resolver = getResolver(framework);
  }

  isInit() {
    return !!this.framework;
  }

  writeFile(path: string, content: string) {
    try {
      fs.writeFileSync(path, content);
    } catch (err) {
      console.error(`Failed to write file at ${path}:`, err);
    }
  }

  isWatchFile(filename: string) {
    return (
      this.dirs.some(({ dir }) => filename.startsWith(dir)) &&
      this.isPageFile(filename) &&
      !this.isIgnoreFile(filename)
    );
  }

  isPageFile(filename: string) {
    const pageFileRegexp =
      this.framework === FrameworkEnum.REACT ? /.(js|ts)x?$/ : /.vue$/;
    return (
      pageFileRegexp.test(filename) && // 文件扩展名符合页面组件
      !/\.d\.ts$/.test(filename) // 排除类型声明文件
    );
  }

  isIgnoreFile(filename: string) {
    return DEFAULT_IGNORED.some((pattern) =>
      new RegExp(pattern).test(filename)
    );
  }
}
