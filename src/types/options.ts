import type { RouteDirectory } from './file.js';
import type { Framework } from './index.js';

export type RouteLoadingMode = 'legacy' | 'modern';

export interface ReactOptions {
  /**
   * legacy:
   *   React.lazy(() => import('path/to/component'))
   * modern:
   *   React Router route.lazy
   */
  routerApiVersion: RouteLoadingMode;
}

export interface VueOptions {}

export interface AutoRoutesOptions {
  dirs?: RouteDirectory[];
  writeToDisk?: boolean;
  framework?: Framework;
  react?: ReactOptions;
  vue?: VueOptions;
}
