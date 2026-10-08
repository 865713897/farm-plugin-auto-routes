export interface RouteMeta {
  id?: string;
  parentId?: string | null;
  meta?: Record<string, unknown>;
}

export interface BaseRoute {
  id: string;
  path: string;
  parentId?: string | null;
  isLayout?: boolean;
  meta?: Record<string, unknown>;
  children?: BaseRoute[];
}

export interface ReactRoute extends BaseRoute {
  Component?: string;
  children?: ReactRoute[];
}

export interface VueRoute extends BaseRoute {
  component?: string;
  children?: VueRoute[];
}
