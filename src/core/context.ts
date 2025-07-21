import fg from 'fast-glob';
import fs from 'fs';

import { DEFAULT_IGNORED, FrameworkEnum } from '../constant.js';
import { getResolvedRoutes } from './parse.js';
import { getResolver } from '../resolve/index.js';
import { dirType, FileItem } from '../types/index.js';
import { getRouteMetaFromFiles } from './routeMeta.js';

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
  private fileListCache: FileItem[] = [];
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

  // 初始化时，获取所有文件列表
  async getInitialFileList() {
    const { suffix } = this.resolver;
    let fileList: FileItem[] = [];
    let filePathList: string[] = [];

    for (const { dir, pattern, basePath, isGlobal = false } of this.dirs) {
      let files = await fg(`**/*.@(${suffix})`, {
        cwd: dir,
        absolute: true,
        onlyFiles: true,
        ignore: this.ignore,
      });

      if (pattern && pattern instanceof RegExp) {
        files = files.filter((file) => pattern.test(file));
      }

      fileList.push({ dir, basePath, files, isGlobal });
      filePathList = filePathList.concat(files);
    }

    this.fileListCache = fileList; // ✅ 缓存
    await getRouteMetaFromFiles(filePathList);
  }

  getFileList(): FileItem[] {
    return this.fileListCache;
  }

  // ✅ 增加文件（文件变动监听时调用）
  addFile(file: string) {
    const dirItem = this.dirs.find(({ dir }) => file.startsWith(dir));
    if (!dirItem) return;

    const { dir, basePath, pattern } = dirItem;

    const cacheItem = this.fileListCache.find(
      (item) =>
        item.dir === dir &&
        item.basePath === basePath &&
        (!pattern || (pattern instanceof RegExp && pattern.test(file)))
    );

    if (cacheItem && !cacheItem.files.includes(file)) {
      cacheItem.files.push(file);
    }
  }

  // ✅ 删除文件（文件变动监听时调用）
  removeFile(file: string) {
    for (const fileGroup of this.fileListCache) {
      const index = fileGroup.files.indexOf(file);
      if (index !== -1) {
        fileGroup.files.splice(index, 1);
      }
    }
  }

  async generateFileContent() {
    if (!this.isInit()) {
      throw new Error('framework not set');
    }

    const { generateTemplate } = this.resolver;

    const fileList = this.getFileList();

    const routesString = await getResolvedRoutes(this.framework, {
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
