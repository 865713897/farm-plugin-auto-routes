import { readFile } from 'node:fs/promises';

export interface MetaData {
  id?: string;
  parentId?: string | null;
  path?: string;
  meta?: Record<string, unknown>;
}

type MetaValue = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];

const routeMetaCache = new Map<string, MetaData>();

const NOT_FOUND = Symbol('NOT_FOUND');

type ExtractTagResult = MetaValue | typeof NOT_FOUND;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 解析注释中的配置值
 *
 * 支持
 * - string
 * - number
 * - boolean
 * - null / undefined
 * - JSON object / array
 */
function parseMetaValue(raw: string, filePath: string): ExtractTagResult {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (raw === 'undefined') return undefined;

  if (raw !== '' && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }

  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
    try {
      return JSON.parse(raw) as Record<string, unknown> | unknown[];
    } catch {
      console.warn(`[farm-plugin-auto-routes] Failed to parse JSON in ${filePath}:`, raw);

      return NOT_FOUND;
    }
  }

  return raw;
}

export function extractTag(content: string, tag: string, filePath: string): ExtractTagResult {
  const escapedTag = escapeRegExp(tag);

  // 支持 //、/* */、<!-- --> 以及普通换行。
  // 结束符不会被当作配置值的一部分。
  const re = new RegExp(`@${escapedTag}:[ \\t]*([^\\r\\n]*?)[ \\t]*(?:\\*\\/|-->)?[ \\t]*$`, 'm');

  const match = content.match(re);

  if (!match) return NOT_FOUND;

  return parseMetaValue(match[1].trim(), filePath);
}

type ValidatorFn = (raw: MetaValue) => boolean;

interface MetaSchemaItem {
  tag: string;
  validate: ValidatorFn;
  parse?: (raw: MetaValue) => MetaValue;
  message?: string;
}

const META_SCHEMA: Record<keyof MetaData, MetaSchemaItem> = {
  id: {
    tag: 'route-id',
    validate: (val) => typeof val === 'string',
    message: 'must be a string',
  },
  parentId: {
    tag: 'route-parent-id',
    validate: (val) => val === null || val === undefined || typeof val === 'string',
    message: 'must be a string or null',
  },
  path: {
    tag: 'route-path',
    validate: (val) => typeof val === 'string',
    message: 'must be a string',
  },
  meta: {
    tag: 'route-meta',
    validate: (val) => typeof val === 'object',
    message: 'must be an object',
  },
};

/**
 * 提取文件头部的注释区域
 *
 * 支持
 * - JavaScript / TypeScript 单行注释：//
 * - JavaScript / TypeScript 块注释：/* *\/
 * - Vue / Html 注释：<!-- -->
 *
 * 允许多个注释块以及注释块之间的空行
 * 遇到第一段非注释代码后停止
 */
export function readHeaderCommentsFromContent(content: string): string {
  const normalized = content.replace(/^\uFEFF/, '');

  const match = normalized.match(/^\s*(?:(?:\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)\s*)*/);

  return match?.[0] ?? '';
}

export function extractMetaFromContent(content: string, filePath: string): MetaData {
  const headerComments = readHeaderCommentsFromContent(content);
  const meta: MetaData = {};

  for (const [key, { tag, validate, message }] of Object.entries(META_SCHEMA)) {
    const raw = extractTag(headerComments, tag, filePath);

    if (raw === NOT_FOUND) continue;

    if (!validate(raw)) {
      console.warn(
        `[farm-plugin-auto-routes] ${filePath}: @${tag} format invalid: ${String(raw)}, ${message}`,
      );

      continue;
    }

    // 保留显式 undefined / null 的语义。
    (meta as Record<string, unknown>)[key] = raw;
  }

  return meta;
}

/**
 * 批量获取路由元信息
 */
export async function getRouteMetaFromFiles(
  filePaths: string[],
): Promise<Record<string, MetaData>> {
  const result: Record<string, MetaData> = {};

  await Promise.all(
    filePaths.map(async (filePath) => {
      const cached = routeMetaCache.get(filePath);

      if (cached) {
        result[filePath] = cached;
        return;
      }

      try {
        const content = await readFile(filePath, 'utf8');
        const meta = extractMetaFromContent(content, filePath);

        routeMetaCache.set(filePath, meta);
        result[filePath] = meta;
      } catch (err) {
        console.warn(`[farm-plugin-auto-routes] Failed to read ${filePath}:`, err);
      }
    }),
  );

  return result;
}

export function clearRouteMetaCache(filePath?: string) {
  if (filePath) {
    routeMetaCache.delete(filePath);
  } else {
    routeMetaCache.clear();
  }
}

export function equalRouteMeta(filePath: string, meta: MetaData): boolean {
  const oldMeta = routeMetaCache.get(filePath);

  return JSON.stringify(oldMeta) === JSON.stringify(meta);
}

export function setRouteMetaCache(filePath: string, meta: MetaData) {
  routeMetaCache.set(filePath, meta);
}
