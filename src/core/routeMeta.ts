import { createReadStream } from 'fs';
import readline from 'readline';

export interface MetaData {
  id?: string;
  parentId?: string | null;
  meta?: Record<string, unknown>;
}

type MetaValue = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];

const routeMetaCache = new Map<string, MetaData>();

export function extractTag(content: string, tag: string, filePath: string): MetaValue | -1 {
  const re = new RegExp(`@${tag}:\\s*(.+)`);
  const match = content.match(re);
  if (!match) return -1;

  const raw = match[1].trim();

  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (raw === 'undefined') return undefined;
  if (!isNaN(Number(raw))) return Number(raw);

  // 支持 JSON 对象解析（可选）
  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
    try {
      return JSON.parse(raw);
    } catch {
      console.warn(`[farm-plugin-auto-routes] failed to parse JSON in ${filePath}:`, raw);
      return -1;
    }
  }

  return raw;
}

type ValidatorFn = (raw: MetaValue) => boolean;

interface MetaSchemaItem {
  tag: string;
  validate?: ValidatorFn;
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
  meta: {
    tag: 'route-meta',
    validate: (val) => typeof val === 'object',
    message: 'must be an object',
  },
};

export function extractMetaFromContent(content: string, filePath: string): MetaData {
  const meta: MetaData = {};

  for (const [key, { tag, validate, message }] of Object.entries(META_SCHEMA)) {
    const raw = extractTag(content, tag, filePath);
    if (raw === -1) continue;

    const isValid = validate ? validate(raw) : true;
    if (!isValid) {
      console.warn(
        `[farm-plugin-auto-routes] ${filePath}: @${tag} format invalid: ${raw}, ${message}`,
      );
      continue;
    }

    (meta as any)[key] = raw;
  }

  return meta;
}

export async function getRouteMetaFromFiles(
  filePaths: string[],
): Promise<Record<string, MetaData>> {
  const result: Record<string, MetaData> = {};
  await Promise.all(
    filePaths.map(async (filePath) => {
      if (routeMetaCache.has(filePath)) {
        result[filePath] = routeMetaCache.get(filePath)!;
        return;
      }

      try {
        const content = await readHeaderComments(filePath);
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

// 读取文件头部的注释信息
export async function readHeaderComments(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    const rs = createReadStream(filePath);
    const rl = readline.createInterface({ input: rs });
    let buffer = '';
    rl.on('line', (line) => {
      if (line.startsWith('//')) {
        // 只读取注释信息
        buffer += line + '\n';
      } else {
        rl.close();
      }
    });
    rl.on('close', () => resolve(buffer));
  });
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
