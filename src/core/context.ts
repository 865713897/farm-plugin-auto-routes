import fg from 'fast-glob';
import pm from 'picomatch';
import fs from 'fs';

import { defaultIgnoredNames } from '../constant.js';
import { getResolver } from '../resolve/index.js';
import { getRouteMetaFromFiles } from './routeMeta.js';
import { toCaseInsensitiveGlob } from '../utils/index.js';

import { DirType, FileItem, ResolverType, Framework } from '../types/index.js';

interface IOpts {
  dirs: DirType[];
  generatePath: string;
  framework: Framework;
  writePath: string;
  writeToDisk?: boolean;
}

export default class Context {
  private dirs: DirType[];
  private ignore: string[];
  private generatePath: string;
  private writeToDisk: boolean;
  private writePath: string;
  private fileListCache: FileItem[] = [];
  private resolver: ResolverType;

  constructor(opts: IOpts) {
    const { dirs, generatePath, writePath, writeToDisk, framework } = opts;
    this.dirs = dirs;
    this.generatePath = generatePath;
    this.writePath = writePath;
    this.writeToDisk = writeToDisk;
    this.resolver = getResolver(framework);
    this.ignore = defaultIgnoredNames.reduce(
      (acc, cur) => {
        acc = acc.concat([
          `**/${toCaseInsensitiveGlob(cur)}.*`,
          `**/${toCaseInsensitiveGlob(cur)}/**`,
        ]);
        return acc;
      },
      ['**/*.d.ts']
    );
  }

  // 初始化时，获取所有文件列表
  async getInitialFileList() {
    const { suffix } = this.resolver;
    let fileList: FileItem[] = [];
    let filePathList: string[] = [];

    for (const { dir, pattern, basePath, isGlobal = false } of this.dirs) {
      const source = `${isGlobal ? 'index' : '**/*'}.@(${suffix})`;
      let files = await fg(source, {
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

  // 增加文件（文件变动监听时调用）
  addFile(file: string) {
    const dirItem = this.dirs.find(({ dir }) => file.startsWith(dir));
    if (!dirItem) return;

    const cacheItem = this.fileListCache.find(
      (item) => item.dir === dirItem.dir && item.basePath === dirItem.basePath
    );

    if (cacheItem && !cacheItem.files.includes(file)) {
      cacheItem.files.push(file);
    }
  }

  // 删除文件（文件变动监听时调用）
  removeFile(file: string) {
    for (const fileGroup of this.fileListCache) {
      const index = fileGroup.files.indexOf(file);
      if (index !== -1) {
        fileGroup.files.splice(index, 1);
      }
    }
  }

  async generateFileContent() {
    const { getResolvedRoutes, generateTemplate } = this.resolver;

    const fileList = this.getFileList();

    const routesString = await getResolvedRoutes({
      fileList,
      generatePath: this.generatePath,
    });
    const template = generateTemplate(routesString);

    if (this.writeToDisk) {
      this.writeFile(this.writePath, template);
    }

    return template;
  }

  writeFile(path: string, content: string) {
    try {
      fs.writeFileSync(path, content);
    } catch (err) {
      console.error(`Failed to write file at ${path}:`, err);
    }
  }

  // 判断是否为监听文件
  isWatchFile(filename: string) {
    const { isPageFile, isGlobalLayoutFile } = this.resolver;
    const belongDirs = this.dirs.some(
      ({ dir, isGlobal, pattern }) =>
        filename.startsWith(dir) &&
        (!pattern || (pattern instanceof RegExp && pattern.test(filename))) &&
        (!isGlobal || (isGlobal && isGlobalLayoutFile(filename)))
    );
    const isPage = isPageFile(filename);
    const isIgnore = this.isIgnoreFile(filename);
    return belongDirs && isPage && !isIgnore; // 属于监听目录，是页面文件，且不是忽略文件
  }

  // 判断文件是否被忽略
  isIgnoreFile(filename: string): boolean {
    return this.ignore.some((item) => {
      const isMatch = pm(item);
      return isMatch(filename);
    });
  }
}
