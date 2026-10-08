import { frameworkMap } from '../constant.js';
import { resolveReact } from './react.js';
import { resolveVue } from './vue.js';
import type { Framework, ReactOptions, VueOptions } from '../types/index.js';

export interface ResolverOptions {
  react?: ReactOptions;
  vue?: VueOptions;
}

export function getResolver(framework: Framework, options?: ResolverOptions) {
  switch (framework) {
    case frameworkMap.REACT:
      return resolveReact(options?.react);
    case frameworkMap.VUE:
      return resolveVue(options?.vue);
    default:
      throw new Error(`Framework ${framework} is not supported.`);
  }
}
