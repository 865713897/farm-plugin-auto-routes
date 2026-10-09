import type { RouteDirectory } from './file.js';
import type { Framework } from './index.js';

export type RouterApiVersion = 'legacy' | 'modern';

export interface ReactOptions {
  /**
   * legacy:
   *   React.lazy(() => import('path/to/component'))
   * modern:
   *   React Router route.lazy
   */
  routerApiVersion: RouterApiVersion;
}

export interface VueOptions {}

export interface AutoRoutesOptions {
  dirs?: RouteDirectory[];
  writeToDisk?: boolean;
  framework?: Framework;
  react?: ReactOptions;
  vue?: VueOptions;
}
